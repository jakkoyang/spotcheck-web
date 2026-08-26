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
    <div className="fixed inset-x-0 bottom-0 z-10 mx-auto w-full max-w-md rounded-t-2xl border border-slate-700 bg-slate-800/90 p-4 shadow-xl backdrop-blur">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-50">{location.name}</h2>
          <p className="text-sm text-slate-400">{location.address}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="shrink-0 rounded-full p-1 text-slate-400 hover:bg-slate-700 hover:text-slate-200"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="mt-4">
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-700">
          <div
            className={`h-2 rounded-full ${busyTierColors[tier].bar}`}
            style={{ width: `${location.busyScore * 10}%` }}
          />
        </div>
        <p className={`mt-1.5 text-sm font-medium ${busyTierColors[tier].text}`}>
          {busyTierDescriptor[tier]}
        </p>
      </div>

      <span className="mt-3 inline-block rounded-full border border-slate-600 bg-slate-700/60 px-2.5 py-0.5 text-xs font-medium text-slate-200">
        {location.atmosphereScore}
      </span>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {tags.map((tag) => (
          <span
            key={tag.id}
            className="rounded-full border border-slate-700 bg-slate-900/60 px-2.5 py-1 text-xs text-slate-300"
          >
            {tag.label}
          </span>
        ))}
      </div>

      <p className="mt-3 text-xs text-slate-500">{getFreshnessLabel(location.lastUpdated)}</p>
    </div>
  )
}
