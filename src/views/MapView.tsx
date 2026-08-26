import { useEffect, useState } from 'react'
import { Map, Marker } from 'react-map-gl/mapbox'
import { LocationCard } from '../components/LocationCard'
import { LocationPin } from '../components/LocationPin'
import { getLocations, getVibeTags } from '../lib/data'
import type { Location, VibeTag } from '../types/location'

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined

export function MapView() {
  const [locations, setLocations] = useState<Location[]>([])
  const [vibeTags, setVibeTags] = useState<VibeTag[]>([])
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null)

  useEffect(() => {
    getLocations().then(setLocations)
    getVibeTags().then(setVibeTags)
  }, [])

  return (
    <div className="h-screen w-screen">
      <Map
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
