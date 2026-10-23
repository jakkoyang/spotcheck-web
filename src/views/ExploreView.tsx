import { useEffect, useRef, useState } from 'react'
import { Map, Marker, type MapRef } from 'react-map-gl/mapbox'
import { MapPin } from 'lucide-react'
import { BottomSheet } from '../components/BottomSheet'
import { FilterBar } from '../components/FilterBar'
import { LocationCard } from '../components/LocationCard'
import { LocationListItem } from '../components/LocationListItem'
import { LocationPin } from '../components/LocationPin'
import { SearchBar } from '../components/SearchBar'
import { getLocations, getVibeTags } from '../lib/data'
import { getSnapHeights, type SheetSnap } from '../lib/sheetSnaps'
import {
  categoryFilters,
  filterSpots,
  sortByLeastBusy,
  type CategoryFilterId,
} from '../lib/spotFilters'
import { usePlaceSearch, type PlaceResult } from '../lib/usePlaceSearch'
import type { Location, VibeTag } from '../types/location'

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined
// Keeps a flown-to point clear of the search bar and filter chips.
const MAP_TOP_PADDING = 120
const DEFAULT_CATEGORY: CategoryFilterId = 'all'

// Frames every given spot in the part of the map the sheet leaves visible.
function fitToSpots(map: MapRef | null, spots: Location[], snap: SheetSnap, animate = true) {
  if (!map || spots.length === 0) return
  const lngs = spots.map((spot) => spot.lng)
  const lats = spots.map((spot) => spot.lat)
  const bottom = getSnapHeights(map.getContainer().clientHeight)[snap] + 24
  map.fitBounds(
    [
      [Math.min(...lngs), Math.min(...lats)],
      [Math.max(...lngs), Math.max(...lats)],
    ],
    { padding: { top: MAP_TOP_PADDING + 16, bottom, left: 40, right: 40 }, maxZoom: 16, animate },
  )
}

export function ExploreView() {
  const [locations, setLocations] = useState<Location[]>([])
  const [vibeTags, setVibeTags] = useState<VibeTag[]>([])
  const [query, setQuery] = useState('')
  const [categoryId, setCategoryId] = useState<CategoryFilterId>(DEFAULT_CATEGORY)
  const [vibeSlugs, setVibeSlugs] = useState<string[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [snap, setSnap] = useState<SheetSnap>('peek')
  const mapRef = useRef<MapRef>(null)
  const placeResults = usePlaceSearch(query)

  useEffect(() => {
    getLocations().then((data) => {
      setLocations(data)
      const initialSpots = filterSpots(data, { query: '', categoryId: DEFAULT_CATEGORY, vibeSlugs: [] })
      fitToSpots(mapRef.current, initialSpots, 'peek', false)
    })
    getVibeTags().then(setVibeTags)
  }, [])

  const results = sortByLeastBusy(filterSpots(locations, { query, categoryId, vibeSlugs }))
  const selectedLocation = locations.find((location) => location.id === selectedId) ?? null
  // The selected spot keeps its pin even if a filter change would hide it.
  const pinnedLocations =
    selectedLocation && !results.includes(selectedLocation) ? [...results, selectedLocation] : results
  const categoryLabel = categoryFilters.find((filter) => filter.id === categoryId)?.label ?? 'All'

  const flyTo = (lat: number, lng: number) => {
    const map = mapRef.current
    if (!map) return
    const bottom = getSnapHeights(map.getContainer().clientHeight).half
    map.flyTo({
      center: [lng, lat],
      zoom: Math.max(map.getZoom(), 16),
      padding: { top: MAP_TOP_PADDING, bottom, left: 0, right: 0 },
    })
  }

  const changeCategory = (id: CategoryFilterId) => {
    setCategoryId(id)
    setSelectedId(null)
    fitToSpots(mapRef.current, filterSpots(locations, { query, categoryId: id, vibeSlugs }), snap)
  }

  const selectLocation = (location: Location) => {
    setSelectedId(location.id)
    setSnap('half')
    flyTo(location.lat, location.lng)
  }

  const selectPlace = (place: PlaceResult) => {
    setQuery('')
    setSelectedId(null)
    setSnap('peek')
    flyTo(place.lat, place.lng)
  }

  const toggleVibe = (slug: string) => {
    const next = vibeSlugs.includes(slug)
      ? vibeSlugs.filter((s) => s !== slug)
      : [...vibeSlugs, slug]
    setVibeSlugs(next)
    fitToSpots(mapRef.current, filterSpots(locations, { query, categoryId, vibeSlugs: next }), snap)
  }

  const clearFilters = () => {
    setQuery('')
    setVibeSlugs([])
    setCategoryId('all')
  }

  const trimmedQuery = query.trim()
  const listTitle = trimmedQuery
    ? `${results.length} ${results.length === 1 ? 'spot matches' : 'spots match'} “${trimmedQuery}”`
    : categoryId === 'all'
      ? `${results.length} spots`
      : `${results.length} ${categoryLabel.toLowerCase()} spots`

  return (
    <div className="relative h-dvh w-screen overflow-hidden bg-neutral-900">
      <Map
        ref={mapRef}
        mapboxAccessToken={MAPBOX_TOKEN}
        initialViewState={{ longitude: -89.4, latitude: 43.0745, zoom: 14.5 }}
        mapStyle="mapbox://styles/mapbox/dark-v11"
        onDragStart={() => setSnap('peek')}
        // Mapbox loads async, so frame the initial spots here too in case data arrived first.
        onLoad={() => fitToSpots(mapRef.current, results, snap, false)}
      >
        {pinnedLocations.map((location) => {
          const isSelected = location.id === selectedId
          return (
            <Marker
              key={location.id}
              longitude={location.lng}
              latitude={location.lat}
              style={{ zIndex: isSelected ? 1 : 0 }}
            >
              <LocationPin
                location={location}
                selected={isSelected}
                onClick={() => selectLocation(location)}
              />
            </Marker>
          )
        })}
      </Map>

      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 p-3">
        <div className="pointer-events-auto mx-auto flex max-w-md flex-col gap-2">
          <SearchBar
            value={query}
            onChange={setQuery}
            onFocus={() => {
              setSelectedId(null)
              setSnap('half')
            }}
          />
          <FilterBar
            categoryId={categoryId}
            onCategoryChange={changeCategory}
            vibeTags={vibeTags}
            selectedVibeSlugs={vibeSlugs}
            onToggleVibe={toggleVibe}
          />
        </div>
      </div>

      <BottomSheet
        snap={snap}
        onSnapChange={setSnap}
        header={
          !selectedLocation && (
            <div className="px-4 pb-2">
              <h2 className="text-sm font-semibold text-neutral-50">{listTitle}</h2>
              <p className="text-xs text-neutral-500">
                {trimmedQuery ? 'Searching all categories' : 'Least busy first'}
              </p>
            </div>
          )
        }
      >
        {selectedLocation ? (
          <LocationCard
            location={selectedLocation}
            vibeTags={vibeTags}
            onClose={() => setSelectedId(null)}
          />
        ) : (
          <div className="flex flex-col gap-2 px-4 pb-6">
            {results.map((location) => (
              <LocationListItem
                key={location.id}
                location={location}
                onClick={() => selectLocation(location)}
              />
            ))}

            {results.length === 0 && placeResults.length === 0 && (
              <div className="py-4 text-center">
                <p className="text-sm text-neutral-400">No spots match these filters.</p>
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-2 text-sm font-medium text-emerald-400 hover:text-emerald-300"
                >
                  Clear filters
                </button>
              </div>
            )}

            {placeResults.length > 0 && (
              <>
                <h3 className="mt-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  Addresses
                </h3>
                {placeResults.map((place) => (
                  <button
                    key={`${place.lat},${place.lng}`}
                    type="button"
                    onClick={() => selectPlace(place)}
                    className="flex w-full items-center gap-3 rounded-xl border border-neutral-800 px-4 py-3 text-left hover:bg-neutral-800"
                  >
                    <MapPin className="h-4 w-4 shrink-0 text-neutral-500" />
                    <span className="min-w-0 truncate text-sm text-neutral-300">{place.label}</span>
                  </button>
                ))}
              </>
            )}
          </div>
        )}
      </BottomSheet>
    </div>
  )
}
