import { X } from 'lucide-react'
import type { Location, VibeTag } from '../types/location'
import { busyTierColors, busyTierDescriptor, getBusyTier } from '../lib/busyTier'
import { getFreshnessLabel } from '../lib/freshness'

interface LocationCardProps {
  location: Location
  vibeTags: VibeTag[]
  onClose: () => void
}

export function LocationCard({ location, vibeTags, onClose }: LocationCardProps) {
  const tier = getBusyTier(location.busyScore)
  const tags = vibeTags.filter((tag) => location.vibeTagSlugs.includes(tag.slug))

  return (
    <div className="absolute inset-x-0 bottom-0 z-10 mx-auto w-full max-w-md rounded-t-2xl border border-neutral-700 bg-neutral-800/90 p-4 shadow-xl backdrop-blur">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-neutral-50">{location.name}</h2>
          <p className="text-sm text-neutral-400">{location.address}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="shrink-0 rounded-full p-1 text-neutral-400 hover:bg-neutral-700 hover:text-neutral-200"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="mt-4">
        <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-700">
          <div
            className={`h-2 rounded-full ${busyTierColors[tier].bar}`}
            style={{ width: `${location.busyScore * 10}%` }}
          />
        </div>
        <p className={`mt-1.5 text-sm font-medium ${busyTierColors[tier].text}`}>
          {busyTierDescriptor[tier]}
        </p>
      </div>

      <span className="mt-3 inline-block rounded-full border border-neutral-600 bg-neutral-700/60 px-2.5 py-0.5 text-xs font-medium text-neutral-200">
        {location.atmosphereScore}
      </span>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {tags.map((tag) => (
          <span
            key={tag.id}
            className="rounded-full border border-neutral-700 bg-neutral-900/60 px-2.5 py-1 text-xs text-neutral-300"
          >
            {tag.label}
          </span>
        ))}
      </div>

      <p className="mt-3 text-xs text-neutral-500">{getFreshnessLabel(location.lastUpdated)}</p>
    </div>
  )
}
