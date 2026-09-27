export type BusyTier = 'low' | 'moderate' | 'high'

export function getBusyTier(busyScore: number): BusyTier {
  if (busyScore <= 3) return 'low'
  if (busyScore <= 7) return 'moderate'
  return 'high'
}

export const busyTierDescriptor: Record<BusyTier, string> = {
  low: 'Plentiful Seating',
  moderate: 'Filling Up',
  high: 'Packed / Hard to find seats',
}

// Raw hex for native map layers, which can't use Tailwind classes (emerald/amber/rose-500).
export const busyTierHex: Record<BusyTier, string> = {
  low: '#10b981',
  moderate: '#f59e0b',
  high: '#f43f5e',
}

export const busyTierColors: Record<BusyTier, { text: string; bar: string }> = {
  low: { text: 'text-emerald-400', bar: 'bg-emerald-500' },
  moderate: { text: 'text-amber-400', bar: 'bg-amber-500' },
  high: { text: 'text-rose-400', bar: 'bg-rose-500' },
}
