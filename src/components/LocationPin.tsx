import type { Location } from '../types/location'
import { type BusyTier, getBusyTier } from '../lib/busyTier'

const tierClasses: Record<BusyTier, string> = {
  low: 'bg-emerald-500 ring-emerald-400/40',
  moderate: 'bg-amber-500 ring-amber-400/40',
  high: 'bg-rose-500 ring-rose-400/40',
}

interface LocationPinProps {
  location: Location
  selected?: boolean
  onClick?: () => void
}

export function LocationPin({ location, selected = false, onClick }: LocationPinProps) {
  const tier = getBusyTier(location.busyScore)

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${location.name}: busy score ${location.busyScore} of 10`}
      aria-pressed={selected}
      className={`h-4 w-4 cursor-pointer rounded-full ring-4 transition-transform ${tierClasses[tier]} ${
        selected ? 'scale-150 outline-2 outline-offset-4 outline-white' : 'hover:scale-125'
      }`}
    />
  )
}
