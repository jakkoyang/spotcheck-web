export type AtmosphereScore = 'Calm' | 'Moderate' | 'Lively'

export interface VibeTag {
  id: string
  slug: string
  label: string
}

export interface Location {
  id: string
  name: string
  category: string
  lat: number
  lng: number
  address: string
  hoursDescription: string
  // OpenStreetMap opening_hours syntax (e.g. "Mo-Fr 07:00-22:00; Sa,Su 08:00-20:00"); null when not verified.
  openingHours: string | null
  amenities: string[]
  busyScore: number
  atmosphereScore: AtmosphereScore
  isActive: boolean
  isFeatured: boolean
  vibeTagSlugs: string[]
  lastUpdated: string
}
