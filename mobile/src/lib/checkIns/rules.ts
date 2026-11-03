import { distanceMeters } from '../distance'
import { getOpenStatus } from '../openingHours'

// How long someone has to stay at a spot before we ask. EXPO_PUBLIC_CHECK_IN_DELAY_SECONDS
// shortens it for testing a dev build without waiting five minutes.
export const PROMPT_DELAY_SECONDS = Number(process.env.EXPO_PUBLIC_CHECK_IN_DELAY_SECONDS) || 5 * 60
// Don't ask about the same spot again for a while, whether or not they answered.
export const SPOT_COOLDOWN_MS = 3 * 60 * 60 * 1000
// Spots this close share that cooldown: one prompt per visit to a building, not one per
// overlapping circle (Android re-reports every circle you're in when they're re-registered).
export const SHARED_COOLDOWN_M = 200
export const DAILY_PROMPT_LIMIT = 3
// Quiet hours, local time: no prompts from 10 PM until 8 AM.
export const QUIET_START_HOUR = 22
export const QUIET_END_HOUR = 8

// The minimal spot data the background task needs; cached on the device because the task
// can run while the app is closed and offline.
export interface CheckInSpot {
  id: string
  name: string
  lat: number
  lng: number
  openingHours: string | null
}

export interface CheckInHistory {
  // Last time we prompted about, or the user reported at, each spot (epoch ms).
  lastTouchedAt: Record<string, number>
  // Epoch ms of the prompts we've scheduled, for the daily limit.
  promptTimes: number[]
}

export const EMPTY_HISTORY: CheckInHistory = { lastTouchedAt: {}, promptTimes: [] }

export type SkipReason = 'quiet-hours' | 'closed' | 'cooldown' | 'daily-limit'

function isQuietHour(now: Date): boolean {
  const hour = now.getHours()
  return QUIET_START_HOUR > QUIET_END_HOUR
    ? hour >= QUIET_START_HOUR || hour < QUIET_END_HOUR
    : hour >= QUIET_START_HOUR && hour < QUIET_END_HOUR
}

function startOfDay(now: Date): number {
  const day = new Date(now)
  day.setHours(0, 0, 0, 0)
  return day.getTime()
}

// Why we shouldn't prompt about this spot right now, or null if we should. `spots` (the cached
// list) is for the shared cooldown with neighbouring spots.
export function skipReason(
  spot: CheckInSpot,
  history: CheckInHistory,
  { quietHours, spots, now = new Date() }: { quietHours: boolean; spots: CheckInSpot[]; now?: Date },
): SkipReason | null {
  if (quietHours && isQuietHour(now)) return 'quiet-hours'
  // Spots with no listed hours get the benefit of the doubt.
  if (getOpenStatus(spot.openingHours, now)?.isOpen === false) return 'closed'
  const coolingDown = (id: string) => {
    const last = history.lastTouchedAt[id]
    return last !== undefined && now.getTime() - last < SPOT_COOLDOWN_MS
  }
  if (coolingDown(spot.id)) return 'cooldown'
  if (spots.some((other) => other.id !== spot.id && coolingDown(other.id) && distanceMeters(spot, other) < SHARED_COOLDOWN_M)) {
    return 'cooldown'
  }
  const today = startOfDay(now)
  if (history.promptTimes.filter((t) => t >= today).length >= DAILY_PROMPT_LIMIT) return 'daily-limit'
  return null
}

// Records a scheduled prompt, dropping entries old enough not to matter any more.
export function withPrompt(history: CheckInHistory, spotId: string, now = Date.now()): CheckInHistory {
  return withTouch(
    { ...history, promptTimes: [...history.promptTimes.filter((t) => now - t < 24 * 60 * 60 * 1000), now] },
    spotId,
    now,
  )
}

// Records that the user dealt with a spot (prompted or reported), restarting its cooldown.
export function withTouch(history: CheckInHistory, spotId: string, now = Date.now()): CheckInHistory {
  const lastTouchedAt = Object.fromEntries(
    Object.entries(history.lastTouchedAt).filter(([, t]) => now - t < SPOT_COOLDOWN_MS),
  )
  return { ...history, lastTouchedAt: { ...lastTouchedAt, [spotId]: now } }
}
