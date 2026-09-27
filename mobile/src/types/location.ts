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
  amenities: string[]
  busyScore: number
  atmosphereScore: AtmosphereScore
  isActive: boolean
  isFeatured: boolean
  vibeTagSlugs: string[]
  lastUpdated: string
}
