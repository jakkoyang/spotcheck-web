import type { Location } from '../types/location'
import { getFreshnessLevel } from './freshness'
import { getOpenStatus } from './openingHours'

export type CategoryFilterId = 'all' | 'study' | 'eat-drink'

export interface CategoryFilter {
  id: CategoryFilterId
  label: string
  // null matches every category
  categories: string[] | null
}

export const categoryFilters: CategoryFilter[] = [
  { id: 'all', label: 'All', categories: null },
  { id: 'study', label: 'Study', categories: ['library', 'union', 'study'] },
  { id: 'eat-drink', label: 'Eat & drink', categories: ['coffee', 'food'] },
]

interface SpotFilterOptions {
  query: string
  categoryId: CategoryFilterId
  vibeSlugs: string[]
  // Only spots whose listed hours say they're open now (spots without hours are excluded).
  openNow?: boolean
  // Only these spot ids (e.g. the user's saved spots).
  onlyIds?: ReadonlySet<string> | null
}

// A search query looks across every category, so typing a name always finds the spot
// even when a different category chip is active.
export function filterSpots(
  locations: Location[],
  { query, categoryId, vibeSlugs, openNow = false, onlyIds = null }: SpotFilterOptions,
): Location[] {
  const normalizedQuery = query.trim().toLowerCase()
  const categories = categoryFilters.find((filter) => filter.id === categoryId)?.categories ?? null
  const now = new Date()

  return locations.filter((location) => {
    if (!location.isActive) return false
    if (onlyIds && !onlyIds.has(location.id)) return false
    if (openNow && !getOpenStatus(location.openingHours, now)?.isOpen) return false
    if (!vibeSlugs.every((slug) => location.vibeTagSlugs.includes(slug))) return false
    if (normalizedQuery) {
      const haystack = `${location.name} ${location.address} ${location.category}`.toLowerCase()
      return haystack.includes(normalizedQuery)
    }
    return !categories || categories.includes(location.category)
  })
}

// Least busy first, but spots without a recent report sink below ones we can vouch for;
// ties go to the most recently updated reading.
export function sortByLeastBusy(locations: Location[]): Location[] {
  const now = Date.now()
  const isStale = (l: Location) => (getFreshnessLevel(l.lastUpdated, now) === 'stale' ? 1 : 0)
  return [...locations].sort(
    (a, b) =>
      isStale(a) - isStale(b) ||
      a.busyScore - b.busyScore ||
      new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime(),
  )
}
