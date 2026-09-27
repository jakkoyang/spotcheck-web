import { useEffect, useState } from 'react'

export interface PlaceResult {
  lat: number
  lng: number
  label: string
}

const NOMINATIM_VIEWBOX = '-89.436,43.084,-89.360,43.058'
const MIN_QUERY_LENGTH = 3
const DEBOUNCE_MS = 450

// Address lookups for queries that aren't one of our spots (e.g. "Camp Randall").
export function usePlaceSearch(query: string): PlaceResult[] {
  const trimmedQuery = query.trim()
  const [results, setResults] = useState<{ query: string; places: PlaceResult[] }>({
    query: '',
    places: [],
  })

  useEffect(() => {
    if (trimmedQuery.length < MIN_QUERY_LENGTH) return

    const controller = new AbortController()
    const timeout = setTimeout(() => {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(trimmedQuery)}&format=json&limit=5&viewbox=${NOMINATIM_VIEWBOX}&bounded=1`
      fetch(url, { signal: controller.signal, headers: { 'Accept-Language': 'en' } })
        .then((res) => res.json())
        .then((places: { lat: string; lon: string; display_name: string }[]) => {
          setResults({
            query: trimmedQuery,
            places: places.map((p) => ({
              lat: parseFloat(p.lat),
              lng: parseFloat(p.lon),
              label: p.display_name,
            })),
          })
        })
        .catch(() => {})
    }, DEBOUNCE_MS)

    return () => {
      clearTimeout(timeout)
      controller.abort()
    }
  }, [trimmedQuery])

  return results.query === trimmedQuery ? results.places : []
}
