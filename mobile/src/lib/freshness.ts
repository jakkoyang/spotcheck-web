const AGING_AFTER_MS = 30 * 60 * 1000
const STALE_AFTER_MS = 2 * 60 * 60 * 1000

// fresh: trust the color; aging: fade it; stale: too old to say how busy it is.
export type FreshnessLevel = 'fresh' | 'aging' | 'stale'

export function getFreshnessLevel(lastUpdated: string, now = Date.now()): FreshnessLevel {
  const age = now - new Date(lastUpdated).getTime()
  if (age > STALE_AFTER_MS) return 'stale'
  if (age > AGING_AFTER_MS) return 'aging'
  return 'fresh'
}

export function getFreshnessLabel(lastUpdated: string): string {
  const diffMs = Date.now() - new Date(lastUpdated).getTime()
  const diffMinutes = Math.round(diffMs / 60_000)

  const relative =
    diffMinutes < 1
      ? 'Updated just now'
      : diffMinutes < 60
        ? `Updated ${diffMinutes}m ago`
        : `Updated ${Math.round(diffMinutes / 60)}h ago`

  return diffMs > STALE_AFTER_MS ? `${relative} · may be out of date` : relative
}
