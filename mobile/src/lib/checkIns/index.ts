import { useCallback, useEffect, useState } from 'react'
import { Platform } from 'react-native'
import * as ExpoLocation from 'expo-location'
import * as Notifications from 'expo-notifications'
import * as TaskManager from 'expo-task-manager'
import type { Coords } from '../distance'
import type { Location } from '../../types/location'
import { readPromptResponse, requestNotificationPermission, type PromptResponse } from './notifications'
import { pickRegions } from './regions'
import { withTouch, type CheckInSpot } from './rules'
import {
  readHistory,
  readSettings,
  writeHistory,
  writePickCenter,
  writeSettings,
  writeSpots,
  type CheckInSettings,
} from './store'
import { cancelCountdown, GEOFENCE_TASK } from './task'

// Check-in prompts: after someone has spent a few minutes at a study spot, a notification asks
// how busy it is. Opt-in, on-device only (no location is uploaded), and rate-limited (rules.ts).

export { ensureNotificationSetup, type PromptResponse } from './notifications'
export type { CheckInSettings } from './store'

export type CheckInEnableResult =
  | 'enabled'
  | 'unavailable'
  | 'location-denied'
  | 'background-denied'
  | 'accuracy-off'
  | 'notifications-denied'

// Asks for each permission in turn (while using the app, then "Always", then notifications) and
// turns prompts on once all three are granted. Call from an explicit user action.
export async function enableCheckIns(): Promise<CheckInEnableResult> {
  if (!(await ExpoLocation.isBackgroundLocationAvailableAsync())) return 'unavailable'
  if (!(await ExpoLocation.requestForegroundPermissionsAsync()).granted) return 'location-denied'
  if (!(await ExpoLocation.requestBackgroundPermissionsAsync()).granted) return 'background-denied'
  // Android's geofencing runs through Google Location Accuracy; with it off, no region ever fires.
  if (Platform.OS === 'android') {
    try {
      await ExpoLocation.enableNetworkProviderAsync()
    } catch {
      return 'accuracy-off'
    }
  }
  if (!(await requestNotificationPermission())) return 'notifications-denied'
  await writeSettings({ ...(await readSettings()), enabled: true })
  return 'enabled'
}

export async function disableCheckIns(): Promise<void> {
  await writeSettings({ ...(await readSettings()), enabled: false })
  if (await TaskManager.isTaskRegisteredAsync(GEOFENCE_TASK)) await ExpoLocation.stopGeofencingAsync(GEOFENCE_TASK)
  await cancelCountdown()
}

const toSpot = (location: Location): CheckInSpot => ({
  id: location.id,
  name: location.name,
  lat: location.lat,
  lng: location.lng,
  openingHours: location.openingHours,
})

// Caches the spots for the background task and watches the ones nearest the user. Call when spots
// load and whenever the app comes back to the front; does nothing while prompts are off.
export async function syncCheckIns(locations: Location[], center: Coords | null): Promise<void> {
  if (!(await readSettings()).enabled) return
  // "Always" was taken away in system settings: turn prompts off rather than fail quietly.
  if (!(await ExpoLocation.getBackgroundPermissionsAsync()).granted) {
    await disableCheckIns()
    return
  }
  const spots = locations.filter((l) => l.isActive).map(toSpot)
  await writeSpots(spots)
  const last = center ? null : await ExpoLocation.getLastKnownPositionAsync().catch(() => null)
  const here = center ?? (last && { lat: last.coords.latitude, lng: last.coords.longitude })
  if (!here || spots.length === 0) return
  await ExpoLocation.startGeofencingAsync(GEOFENCE_TASK, pickRegions(spots, here))
  await writePickCenter(here)
}

// A report from anywhere counts: don't prompt about that spot again for a while.
export async function noteReported(spotId: string): Promise<void> {
  await writeHistory(withTouch(await readHistory(), spotId))
}

export function useCheckInSettings() {
  const [settings, setSettings] = useState<CheckInSettings | null>(null)
  const refresh = useCallback(() => {
    readSettings().then(setSettings)
  }, [])
  useEffect(refresh, [refresh])

  const update = useCallback(async (patch: Partial<CheckInSettings>) => {
    const next = { ...(await readSettings()), ...patch }
    await writeSettings(next)
    setSettings(next)
  }, [])

  return { settings, refresh, update }
}

// Each response is handled once, though the launch response and the listener can both report it.
const handledResponseKeys = new Set<string>()

// Calls `onPrompt` for the check-in notification that launched the app (if any) and for each one
// tapped while it runs. Returns an unsubscribe function.
export function subscribeToPromptResponses(onPrompt: (prompt: PromptResponse) => void): () => void {
  const handle = (response: Notifications.NotificationResponse | null) => {
    const prompt = response && readPromptResponse(response)
    if (!response || !prompt || handledResponseKeys.has(prompt.key)) return
    handledResponseKeys.add(prompt.key)
    // Answered: take it out of the tray, and don't hand it out again on the next launch.
    Notifications.dismissNotificationAsync(response.notification.request.identifier).catch(() => {})
    Notifications.clearLastNotificationResponseAsync().catch(() => {})
    onPrompt(prompt)
  }
  Notifications.getLastNotificationResponseAsync().then(handle).catch(() => {})
  const subscription = Notifications.addNotificationResponseReceivedListener(handle)
  return () => subscription.remove()
}
