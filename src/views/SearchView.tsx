import { useEffect, useState } from 'react'
import { LocationCard } from '../components/LocationCard'
import { LocationListItem } from '../components/LocationListItem'
import { getLocations, getVibeTags } from '../lib/data'
import type { Location, VibeTag } from '../types/location'

export function SearchView() {
  const [locations, setLocations] = useState<Location[]>([])
  const [vibeTags, setVibeTags] = useState<VibeTag[]>([])
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null)
  const [query, setQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)
  const [selectedVibeSlugs, setSelectedVibeSlugs] = useState<string[]>([])

  useEffect(() => {
    getLocations().then(setLocations)
    getVibeTags().then(setVibeTags)
  }, [])

  const categories = Array.from(new Set(locations.map((location) => location.category)))

  const toggleVibeSlug = (slug: string) => {
    setSelectedVibeSlugs((current) =>
      current.includes(slug) ? current.filter((s) => s !== slug) : [...current, slug],
    )
  }

  const results = locations.filter((location) => {
    const matchesQuery = location.name.toLowerCase().includes(query.toLowerCase())
    const matchesCategory = !categoryFilter || location.category === categoryFilter
    const matchesVibes = selectedVibeSlugs.every((slug) => location.vibeTagSlugs.includes(slug))
    return matchesQuery && matchesCategory && matchesVibes
  })

  return (
    <div className="h-full w-full overflow-y-auto bg-neutral-900 p-6">
      <h1 className="text-lg font-semibold text-neutral-50">Search</h1>

      <input
        type="text"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search by name"
        className="mt-4 w-full rounded-lg border border-neutral-700 bg-neutral-800/60 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-emerald-400"
      />

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setCategoryFilter(null)}
          className={`rounded-full border px-3 py-1 text-xs font-medium capitalize ${
            categoryFilter === null
              ? 'border-emerald-400 bg-emerald-400/10 text-emerald-400'
              : 'border-neutral-700 bg-neutral-800/60 text-neutral-300'
          }`}
        >
          All
        </button>
        {categories.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => setCategoryFilter(category)}
            className={`rounded-full border px-3 py-1 text-xs font-medium capitalize ${
              categoryFilter === category
                ? 'border-emerald-400 bg-emerald-400/10 text-emerald-400'
                : 'border-neutral-700 bg-neutral-800/60 text-neutral-300'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {vibeTags.map((tag) => (
          <button
            key={tag.id}
            type="button"
            onClick={() => toggleVibeSlug(tag.slug)}
            className={`rounded-full border px-3 py-1 text-xs font-medium ${
              selectedVibeSlugs.includes(tag.slug)
                ? 'border-emerald-400 bg-emerald-400/10 text-emerald-400'
                : 'border-neutral-700 bg-neutral-800/60 text-neutral-300'
            }`}
          >
            {tag.label}
          </button>
        ))}
      </div>

      <div className="mt-6 flex flex-col gap-2">
        {results.map((location) => (
          <LocationListItem
            key={location.id}
            location={location}
            onClick={() => setSelectedLocation(location)}
          />
        ))}
        {results.length === 0 && (
          <p className="mt-4 text-center text-sm text-neutral-500">No matching spots found.</p>
        )}
      </div>

      {selectedLocation && (
        <LocationCard
          location={selectedLocation}
          vibeTags={vibeTags}
          onClose={() => setSelectedLocation(null)}
        />
      )}
    </div>
  )
}
