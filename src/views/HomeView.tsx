import { useEffect, useState } from 'react'
import { LocationCard } from '../components/LocationCard'
import { LocationListItem } from '../components/LocationListItem'
import { getLocations, getVibeTags } from '../lib/data'
import type { Location, VibeTag } from '../types/location'

export function HomeView() {
  const [locations, setLocations] = useState<Location[]>([])
  const [vibeTags, setVibeTags] = useState<VibeTag[]>([])
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null)

  useEffect(() => {
    getLocations().then(setLocations)
    getVibeTags().then(setVibeTags)
  }, [])

  const leastBusy = [...locations].sort((a, b) => a.busyScore - b.busyScore).slice(0, 3)

  return (
    <div className="h-full w-full overflow-y-auto bg-neutral-900 p-6">
      <h1 className="text-2xl font-semibold text-neutral-50">SpotCheck</h1>
      <p className="mt-1 text-sm text-neutral-400">
        See how busy UW-Madison study spots are before you walk there.
      </p>

      <h2 className="mt-6 text-sm font-semibold uppercase tracking-wide text-neutral-400">
        Least Busy Right Now
      </h2>
      <div className="mt-3 flex flex-col gap-2">
        {leastBusy.map((location) => (
          <LocationListItem
            key={location.id}
            location={location}
            onClick={() => setSelectedLocation(location)}
          />
        ))}
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
