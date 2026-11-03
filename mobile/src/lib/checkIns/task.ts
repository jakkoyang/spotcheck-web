import * as ExpoLocation from 'expo-location'
import * as TaskManager from 'expo-task-manager'
import { distanceMeters, type Coords } from '../distance'
import { cancelPrompt, isPromptScheduled, schedulePrompt } from './notifications'
import { pickRegions } from './regions'
import { skipReason, withPrompt, type CheckInHistory } from './rules'
import {
  readHistory,
  readPending,
  readSettings,
  readSpots,
  writeHistory,
  writePending,
  type PendingPrompt,
} from './store'

// Runs when the OS reports the user entering or leaving a watched spot, including while the app
// is in the background (and, on iOS, after it has been closed). It must be defined at module
// scope before the app renders, which is why the custom entry file (mobile/index.ts) imports it.
export const GEOFENCE_TASK = 'spotcheck-check-in-geofence'

interface GeofenceEvent {
  eventType: ExpoLocation.GeofencingEventType
  region: ExpoLocation.LocationRegion
}

// The pending prompt if it's still counting down (not shown yet), otherwise null.
async function countingDown(pending: PendingPrompt | null): Promise<PendingPrompt | null> {
  return pending && (await isPromptScheduled()) ? pending : null
}

const POSITION_TIMEOUT_MS = 5000

// A fresh fix where possible: the last known position can lag well behind on entering a spot.
async function currentCoords(): Promise<Coords | null> {
  const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), POSITION_TIMEOUT_MS))
  const fresh = ExpoLocation.getCurrentPositionAsync({ accuracy: ExpoLocation.Accuracy.Balanced }).catch(() => null)
  const position = (await Promise.race([fresh, timeout])) ?? (await ExpoLocation.getLastKnownPositionAsync().catch(() => null))
  return position && { lat: position.coords.latitude, lng: position.coords.longitude }
}

// Undoes a prompt cancelled before it showed, so it doesn't use up the cooldown or daily limit.
function withoutPrompt(history: CheckInHistory, pending: PendingPrompt): CheckInHistory {
  const { [pending.spotId]: touchedAt, ...others } = history.lastTouchedAt
  return {
    lastTouchedAt: touchedAt === pending.scheduledAt ? others : history.lastTouchedAt,
    promptTimes: history.promptTimes.filter((t) => t !== pending.scheduledAt),
  }
}

export async function cancelCountdown(): Promise<void> {
  const pending = await countingDown(await readPending())
  if (pending) {
    await cancelPrompt(pending.notificationId)
    await writeHistory(withoutPrompt(await readHistory(), pending))
  }
  await writePending(null)
}

async function handleEnter(spotId: string): Promise<void> {
  const settings = await readSettings()
  if (!settings.enabled) return
  const spots = await readSpots()
  const spot = spots.find((s) => s.id === spotId)
  if (!spot) return
  const [history, counting] = await Promise.all([readHistory(), readPending().then(countingDown)])
  if (counting?.spotId === spotId) return
  // Judge this spot as if the prompt still counting down didn't exist: it may be the one replaced,
  // and it shouldn't hold this spot back through the shared cooldown.
  const base = counting ? withoutPrompt(history, counting) : history
  if (skipReason(spot, base, { quietHours: settings.quietHours, spots })) return

  if (counting) {
    // Overlapping circles: only ask about whichever spot the user is actually closer to.
    const other = spots.find((s) => s.id === counting.spotId)
    if (other) {
      const here = await currentCoords()
      if (!here || distanceMeters(here, other) <= distanceMeters(here, spot)) return
    }
    await cancelPrompt(counting.notificationId)
  }

  const now = Date.now()
  const notificationId = await schedulePrompt(spot)
  await Promise.all([
    writePending({ spotId, notificationId, scheduledAt: now }),
    writeHistory(withPrompt(base, spotId, now)),
  ])
}

async function handleExit(region: ExpoLocation.LocationRegion): Promise<void> {
  const pending = await readPending()
  // Left before the delay was up: they weren't really there, so don't ask.
  if (pending?.spotId === region.identifier) await cancelCountdown()

  // Re-pick the watched spots around where the user just was, so the nearest 20 stay covered.
  const spots = await readSpots()
  if (spots.length === 0) return
  const next = pickRegions(spots, { lat: region.latitude, lng: region.longitude })
  const current = await TaskManager.getTaskOptionsAsync<{ regions?: ExpoLocation.LocationRegion[] }>(GEOFENCE_TASK).catch(
    () => null,
  )
  const ids = (regions: ExpoLocation.LocationRegion[] | undefined) => (regions ?? []).map((r) => r.identifier).sort().join()
  if (ids(current?.regions) !== ids(next)) await ExpoLocation.startGeofencingAsync(GEOFENCE_TASK, next)
}

// Overlapping spots deliver their enter events together. Handle them one at a time, or each sees
// "nothing pending" and schedules its own prompt.
let queue: Promise<void> = Promise.resolve()

function handleEvent({ eventType, region }: GeofenceEvent): Promise<void> {
  if (eventType === ExpoLocation.GeofencingEventType.Enter) return handleEnter(region.identifier!)
  if (eventType === ExpoLocation.GeofencingEventType.Exit) return handleExit(region)
  return Promise.resolve()
}

TaskManager.defineTask<GeofenceEvent>(GEOFENCE_TASK, ({ data, error }) => {
  if (error || !data?.region.identifier) return Promise.resolve()
  // A failed check-in is never worth surfacing; the next event tries again.
  queue = queue.then(() => handleEvent(data)).catch(() => {})
  return queue
})
