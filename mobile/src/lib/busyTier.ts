export type BusyTier = 'low' | 'moderate' | 'high'

export function getBusyTier(busyScore: number): BusyTier {
  if (busyScore <= 3) return 'low'
  if (busyScore <= 7) return 'moderate'
  return 'high'
}

export const busyTierDescriptor: Record<BusyTier, string> = {
  low: 'Empty',
  moderate: 'Busy',
  high: 'Packed',
}

// Raw hex for native map layers, which can't use Tailwind classes (violet/amber/rose-500).
export const busyTierHex: Record<BusyTier, string> = {
  low: '#8b5cf6',
  moderate: '#f59e0b',
  high: '#f43f5e',
}

// Pins whose last report is too old to trust (neutral-500).
export const STALE_HEX = '#737373'

// text: on a neutral background; bar: solid fills; soft/onSoft: tinted panels and badges.
export const busyTierColors: Record<BusyTier, { text: string; bar: string; soft: string; onSoft: string }> = {
  low: {
    text: 'text-violet-600 dark:text-violet-400',
    bar: 'bg-violet-500',
    soft: 'bg-violet-50 dark:bg-violet-950',
    onSoft: 'text-violet-800 dark:text-violet-200',
  },
  moderate: {
    text: 'text-amber-600 dark:text-amber-400',
    bar: 'bg-amber-500',
    soft: 'bg-amber-50 dark:bg-amber-950',
    onSoft: 'text-amber-800 dark:text-amber-200',
  },
  high: {
    text: 'text-rose-600 dark:text-rose-400',
    bar: 'bg-rose-500',
    soft: 'bg-rose-50 dark:bg-rose-950',
    onSoft: 'text-rose-800 dark:text-rose-200',
  },
}
