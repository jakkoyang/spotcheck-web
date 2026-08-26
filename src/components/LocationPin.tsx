import type { Location } from '../types/location'
import { type BusyTier, getBusyTier } from '../lib/busyTier'

const tierClasses: Record<BusyTier, string> = {
  low: 'bg-emerald-500 ring-emerald-400/40',
  moderate: 'bg-amber-500 ring-amber-400/40',
  high: 'bg-rose-500 ring-rose-400/40',
}

interface LocationPinProps {
  location: Location
  onClick?: () => void
}

export function LocationPin({ location, onClick }: LocationPinProps) {
  const tier = getBusyTier(location.busyScore)

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${location.name}: busy score ${location.busyScore} of 10`}
      className={`h-4 w-4 cursor-pointer rounded-full ring-4 transition-transform hover:scale-125 ${tierClasses[tier]}`}
    />
  )
}
