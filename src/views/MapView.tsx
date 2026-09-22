import { useEffect, useRef, useState } from 'react'
import { Map, Marker, type MapRef } from 'react-map-gl/mapbox'
import { LocationCard } from '../components/LocationCard'
import { LocationPin } from '../components/LocationPin'
import { MapSearchBar } from '../components/MapSearchBar'
import type { PlaceResult } from '../components/LocationSearchInput'
import { getLocations, getVibeTags } from '../lib/data'
import type { Location, VibeTag } from '../types/location'

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined

export function MapView() {
  const [locations, setLocations] = useState<Location[]>([])
  const [vibeTags, setVibeTags] = useState<VibeTag[]>([])
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null)
  const mapRef = useRef<MapRef>(null)

  useEffect(() => {
    getLocations().then(setLocations)
    getVibeTags().then(setVibeTags)
  }, [])

  const flyTo = (lat: number, lng: number) => {
    mapRef.current?.flyTo({ center: [lng, lat], zoom: 16 })
  }

  return (
    <div className="h-full w-full bg-neutral-900">
      <Map
        ref={mapRef}
        mapboxAccessToken={MAPBOX_TOKEN}
        initialViewState={{ longitude: -89.4125, latitude: 43.0766, zoom: 14.5 }}
        mapStyle="mapbox://styles/mapbox/dark-v11"
      >
        {locations.map((location) => (
          <Marker key={location.id} longitude={location.lng} latitude={location.lat}>
            <LocationPin location={location} onClick={() => setSelectedLocation(location)} />
          </Marker>
        ))}
      </Map>

      <MapSearchBar
        locations={locations}
        onSelectLocation={(location) => {
          setSelectedLocation(location)
          flyTo(location.lat, location.lng)
        }}
        onSelectPlace={(place: PlaceResult) => {
          setSelectedLocation(null)
          flyTo(place.lat, place.lng)
        }}
      />

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
