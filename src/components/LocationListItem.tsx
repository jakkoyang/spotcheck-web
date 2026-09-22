import type { Location } from '../types/location'
import { busyTierColors, busyTierDescriptor, getBusyTier } from '../lib/busyTier'
import { getFreshnessLabel } from '../lib/freshness'

interface LocationListItemProps {
  location: Location
  onClick?: () => void
}

export function LocationListItem({ location, onClick }: LocationListItemProps) {
  const tier = getBusyTier(location.busyScore)

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between gap-3 rounded-xl border border-neutral-700 bg-neutral-800/60 px-4 py-3 text-left hover:bg-neutral-800"
    >
      <div>
        <p className="text-sm font-semibold text-neutral-50">{location.name}</p>
        <p className="text-xs capitalize text-neutral-400">{location.category}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <div className="flex items-center gap-1.5">
          <span className={`h-2 w-2 rounded-full ${busyTierColors[tier].bar}`} />
          <span className={`text-xs font-medium ${busyTierColors[tier].text}`}>
            {busyTierDescriptor[tier]}
          </span>
        </div>
        <p className="text-xs text-neutral-500">{getFreshnessLabel(location.lastUpdated)}</p>
      </div>
    </button>
  )
}
