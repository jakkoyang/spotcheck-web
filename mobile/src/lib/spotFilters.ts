import type { Location } from '../types/location'

export type CategoryFilterId = 'study' | 'coffee' | 'food' | 'parks' | 'things-to-do' | 'all'

export interface CategoryFilter {
  id: CategoryFilterId
  label: string
  // null matches every category
  categories: string[] | null
}

export const categoryFilters: CategoryFilter[] = [
  { id: 'study', label: 'Study', categories: ['library', 'union', 'study'] },
  { id: 'coffee', label: 'Coffee', categories: ['coffee'] },
  { id: 'food', label: 'Food', categories: ['food'] },
  { id: 'parks', label: 'Parks', categories: ['park'] },
  { id: 'things-to-do', label: 'Things to do', categories: ['venue', 'shop'] },
  { id: 'all', label: 'All', categories: null },
]

interface SpotFilterOptions {
  query: string
  categoryId: CategoryFilterId
  vibeSlugs: string[]
}

// A search query looks across every category, so typing a name always finds the spot
// even when a different category chip is active.
export function filterSpots(
  locations: Location[],
  { query, categoryId, vibeSlugs }: SpotFilterOptions,
): Location[] {
  const normalizedQuery = query.trim().toLowerCase()
  const categories = categoryFilters.find((filter) => filter.id === categoryId)?.categories ?? null

  return locations.filter((location) => {
    if (!location.isActive) return false
    if (!vibeSlugs.every((slug) => location.vibeTagSlugs.includes(slug))) return false
    if (normalizedQuery) {
      const haystack = `${location.name} ${location.address} ${location.category}`.toLowerCase()
      return haystack.includes(normalizedQuery)
    }
    return !categories || categories.includes(location.category)
  })
}

// Least busy first; ties go to the most recently updated reading.
export function sortByLeastBusy(locations: Location[]): Location[] {
  return [...locations].sort(
    (a, b) =>
      a.busyScore - b.busyScore ||
      new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime(),
  )
}
