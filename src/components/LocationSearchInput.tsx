import { useEffect, useRef, useState } from 'react'
import { Search, X } from 'lucide-react'
import { busyTierColors, busyTierDescriptor, getBusyTier } from '../lib/busyTier'
import type { Location } from '../types/location'

export interface PlaceResult {
  lat: number
  lng: number
  label: string
}

interface LocationSearchInputProps {
  locations: Location[]
  placeholder: string
  initialValue?: string
  onSelectLocation: (location: Location) => void
  onSelectPlace: (place: PlaceResult) => void
}

const NOMINATIM_VIEWBOX = '-89.436,43.084,-89.360,43.058'

export function LocationSearchInput({
  locations,
  placeholder,
  initialValue,
  onSelectLocation,
  onSelectPlace,
}: LocationSearchInputProps) {
  const [query, setQuery] = useState(initialValue ?? '')
  const [isOpen, setIsOpen] = useState(false)
  const [placeResults, setPlaceResults] = useState<PlaceResult[]>([])
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    setQuery(initialValue ?? '')
  }, [initialValue])

  const trimmedQuery = query.trim()
  const localMatches = trimmedQuery.length
    ? locations.filter((location) => {
        const haystack = `${location.name} ${location.address} ${location.category}`.toLowerCase()
        return haystack.includes(trimmedQuery.toLowerCase())
      })
    : []

  useEffect(() => {
    if (trimmedQuery.length < 3) {
      setPlaceResults([])
      return
    }

    const timeout = setTimeout(() => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(trimmedQuery)}&format=json&limit=5&viewbox=${NOMINATIM_VIEWBOX}&bounded=1`
      fetch(url, { signal: controller.signal, headers: { 'Accept-Language': 'en' } })
        .then((res) => res.json())
        .then((results: { lat: string; lon: string; display_name: string }[]) => {
          setPlaceResults(
            results.map((r) => ({ lat: parseFloat(r.lat), lng: parseFloat(r.lon), label: r.display_name })),
          )
        })
        .catch(() => {})
    }, 450)

    return () => clearTimeout(timeout)
  }, [trimmedQuery])

  const handleSelectLocation = (location: Location) => {
    setQuery(location.name)
    setIsOpen(false)
    onSelectLocation(location)
  }

  const handleSelectPlace = (place: PlaceResult) => {
    setQuery(place.label)
    setIsOpen(false)
    onSelectPlace(place)
  }

  const hasResults = localMatches.length > 0 || placeResults.length > 0
  const showDropdown = isOpen && hasResults

  return (
    <div className="relative">
      <div
        className={`flex items-center gap-2 border border-neutral-700 bg-neutral-900/95 px-3 py-2 shadow-[0_4px_16px_rgba(0,0,0,0.35)] backdrop-blur ${
          showDropdown ? 'rounded-t-xl border-b-neutral-800' : 'rounded-xl'
        }`}
      >
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 150)}
          placeholder={placeholder}
          className="w-full bg-transparent text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none"
        />
        {query && (
          <button
            type="button"
            onMouseDown={() => setQuery('')}
            aria-label="Clear"
            className="shrink-0 text-neutral-500 hover:text-neutral-300"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        <Search className="h-4 w-4 shrink-0 text-neutral-400" />
      </div>

      {showDropdown && (
        <div className="absolute inset-x-0 top-full z-10 max-h-80 overflow-y-auto rounded-b-xl border border-t-0 border-neutral-700 bg-neutral-900/95 shadow-[0_4px_16px_rgba(0,0,0,0.35)] backdrop-blur">
          {localMatches.map((location) => {
            const tier = getBusyTier(location.busyScore)
            return (
              <button
                key={location.id}
                type="button"
                onMouseDown={() => handleSelectLocation(location)}
                className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-neutral-800"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-neutral-100">{location.name}</p>
                  <p className="truncate text-xs text-neutral-400">
                    <span className="capitalize">{location.category}</span> · {location.address}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${busyTierColors[tier].bar} text-neutral-900`}
                >
                  {busyTierDescriptor[tier]}
                </span>
              </button>
            )
          })}
          {placeResults.map((place, index) => (
            <button
              key={index}
              type="button"
              onMouseDown={() => handleSelectPlace(place)}
              className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-neutral-800"
            >
              <p className="min-w-0 truncate text-sm font-medium text-neutral-200">{place.label}</p>
              <span className="shrink-0 rounded-full border border-neutral-600 px-2 py-0.5 text-[11px] font-medium text-neutral-400">
                Address
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
