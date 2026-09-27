const STALE_AFTER_MS = 4 * 60 * 60 * 1000

export function getFreshnessLabel(lastUpdated: string): string {
  const diffMs = Date.now() - new Date(lastUpdated).getTime()
  const diffMinutes = Math.round(diffMs / 60_000)

  const relative =
    diffMinutes < 1
      ? 'Updated just now'
      : diffMinutes < 60
        ? `Updated ${diffMinutes}m ago`
        : `Updated ${Math.round(diffMinutes / 60)}h ago`

  return diffMs > STALE_AFTER_MS ? `${relative} · Update pending` : relative
}
