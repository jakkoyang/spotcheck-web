import { Platform } from 'react-native'
import * as Notifications from 'expo-notifications'
import { busyTierDescriptor, busyTierReportScore, type BusyTier } from '../busyTier'
import { PROMPT_DELAY_SECONDS, type CheckInSpot } from './rules'

// No ':' or '-' allowed in category identifiers.
const CATEGORY = 'busy_check_in'
const ANDROID_CHANNEL = 'check-ins'
const ACTION_PREFIX = 'report_'
const TIERS: BusyTier[] = ['low', 'moderate', 'high']

// Show prompts even while the app is open (the default is to drop them silently).
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
})

// The Android channel must exist before Android 13 will show the notification permission prompt.
export async function ensureNotificationSetup(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL, {
      name: 'Check-in prompts',
      description: 'Asks how busy a study spot is after you have been there a few minutes.',
      importance: Notifications.AndroidImportance.DEFAULT,
    })
  }
  // The buttons open the app, which then sends the report: iOS can't reliably run the report in
  // the background from an action, and doing the same on both platforms keeps it predictable.
  await Notifications.setNotificationCategoryAsync(
    CATEGORY,
    TIERS.map((tier) => ({
      identifier: `${ACTION_PREFIX}${tier}`,
      buttonTitle: busyTierDescriptor[tier],
      options: { opensAppToForeground: true },
    })),
  )
}

export async function requestNotificationPermission(): Promise<boolean> {
  await ensureNotificationSetup()
  const current = await Notifications.getPermissionsAsync()
  if (current.granted) return true
  const result = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowSound: true, allowBadge: false },
  })
  return result.granted
}

// Every prompt uses the same id, so scheduling one replaces any earlier one (scheduled or in the
// tray): there is never more than one "are you at…?" at a time.
const PROMPT_ID = 'check-in-prompt'

// Schedules the "how busy is it?" prompt for after the dwell delay; returns its id for cancelling.
export function schedulePrompt(spot: CheckInSpot): Promise<string> {
  return Notifications.scheduleNotificationAsync({
    identifier: PROMPT_ID,
    content: {
      title: `Are you at ${spot.name}?`,
      body: 'How busy is it right now? Tap one to let everyone know.',
      categoryIdentifier: CATEGORY,
      data: { spotId: spot.id },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: PROMPT_DELAY_SECONDS,
      channelId: ANDROID_CHANNEL,
    },
  })
}

export const cancelPrompt = (notificationId: string) =>
  Notifications.cancelScheduledNotificationAsync(notificationId).catch(() => {})

// Whether a prompt is still waiting to be shown. Asked of the system rather than worked out from
// the delay: Android's inexact alarms can show it well after PROMPT_DELAY_SECONDS.
export async function isPromptScheduled(): Promise<boolean> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync().catch(() => [])
  return scheduled.some((notification) => notification.identifier === PROMPT_ID)
}

// What a tap on a check-in notification asks for: open the spot, and maybe report a level.
export interface PromptResponse {
  key: string
  spotId: string
  busyScore: number | null
}

export function readPromptResponse(response: Notifications.NotificationResponse): PromptResponse | null {
  const { request } = response.notification
  const spotId = request.content.data?.spotId
  if (typeof spotId !== 'string') return null
  const tier = TIERS.find((t) => response.actionIdentifier === `${ACTION_PREFIX}${t}`)
  return {
    key: `${request.identifier}:${response.actionIdentifier}`,
    spotId,
    busyScore: tier ? busyTierReportScore[tier] : null,
  }
}
