import type { AtmosphereScore, Location, VibeTag } from '../types/location'
import { mockLocations, mockVibeTags } from './mockData'
import { getSupabaseClient } from './supabaseClient'

interface LocationRow {
  id: string
  name: string
  category: string
  lat: number
  lng: number
  address: string
  hours_description: string
  amenities: string[]
  busy_score: number
  atmosphere_score: string
  is_active: boolean
  is_featured: boolean
  last_updated: string
  location_tags: { vibe_tags: { slug: string } | null }[]
}

function toLocation(row: LocationRow): Location {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    lat: row.lat,
    lng: row.lng,
    address: row.address,
    hoursDescription: row.hours_description,
    amenities: row.amenities,
    busyScore: row.busy_score,
    atmosphereScore: row.atmosphere_score as AtmosphereScore,
    isActive: row.is_active,
    isFeatured: row.is_featured,
    vibeTagSlugs: row.location_tags
      .map((tag) => tag.vibe_tags?.slug)
      .filter((slug): slug is string => Boolean(slug)),
    lastUpdated: row.last_updated,
  }
}

export async function getLocations(): Promise<Location[]> {
  const supabase = getSupabaseClient()
  if (!supabase) return mockLocations

  const { data, error } = await supabase
    .from('locations')
    .select('*, location_tags(vibe_tags(slug))')

  if (error || !data) return mockLocations
  return (data as LocationRow[]).map(toLocation)
}

export async function getVibeTags(): Promise<VibeTag[]> {
  const supabase = getSupabaseClient()
  if (!supabase) return mockVibeTags

  const { data, error } = await supabase.from('vibe_tags').select('id, slug, label')

  if (error || !data) return mockVibeTags
  return data
}
