import { useEffect, useState } from 'react'
import { Map, Marker } from 'react-map-gl/mapbox'
import { LocationPin } from '../components/LocationPin'
import { getLocations } from '../lib/data'
import type { Location } from '../types/location'

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined

export function MapView() {
  const [locations, setLocations] = useState<Location[]>([])

  useEffect(() => {
    getLocations().then(setLocations)
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
            <LocationPin location={location} />
          </Marker>
        ))}
      </Map>
    </div>
  )
}
