import { LocationSearchInput, type PlaceResult } from './LocationSearchInput'
import type { Location } from '../types/location'

interface MapSearchBarProps {
  locations: Location[]
  onSelectLocation: (location: Location) => void
  onSelectPlace: (place: PlaceResult) => void
}

export function MapSearchBar({ locations, onSelectLocation, onSelectPlace }: MapSearchBarProps) {
  return (
    <div className="absolute inset-x-0 top-0 z-10 p-3">
      <div className="mx-auto max-w-md">
        <LocationSearchInput
          locations={locations}
          placeholder="Search locations or addresses"
          onSelectLocation={onSelectLocation}
          onSelectPlace={onSelectPlace}
        />
      </div>
    </div>
  )
}
