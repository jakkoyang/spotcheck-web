import AsyncStorage from '@react-native-async-storage/async-storage'
import type { AtmosphereScore, Location, VibeTag } from '../types/location'
import { mockLocations, mockVibeTags } from './mockData'
import { getSupabaseClient } from './supabaseClient'

// Set by start-native-mock.cmd so spot data comes from mockData even when .env points at a
// live project. Auth still uses Supabase.
const USE_MOCK_DATA = process.env.EXPO_PUBLIC_USE_MOCK_DATA === '1'
const getDataClient = () => (USE_MOCK_DATA ? null : getSupabaseClient())

interface LocationRow {
  id: string
  name: string
  category: string
  lat: number
  lng: number
  address: string
  hours_description: string
  opening_hours: string | null
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
    openingHours: row.opening_hours ?? null,
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

const LOCATION_SELECT = '*, location_tags(vibe_tags(slug))'

export async function getLocations(): Promise<Location[]> {
  const supabase = getDataClient()
  if (!supabase) return mockLocations

  const { data, error } = await supabase
    .from('locations')
    .select(LOCATION_SELECT)

  if (error || !data) return mockLocations
  return (data as LocationRow[]).map(toLocation)
}

export async function getVibeTags(): Promise<VibeTag[]> {
  const supabase = getDataClient()
  if (!supabase) return mockVibeTags

  const { data, error } = await supabase.from('vibe_tags').select('id, slug, label')

  if (error || !data) return mockVibeTags
  return data
}

// Live reports are tied to an account (RLS: authenticated inserts only); mock mode keeps
// them on the device so the flow can be tried without sign-in.
export function busyReportsRequireSignIn(): boolean {
  return getDataClient() !== null
}

// Records "how busy is it right now" and returns the spot with its refreshed score.
// Live: inserts into busy_reports; a trigger (migration 0002) recomputes locations.busy_score.
export async function submitBusyReport(locationId: string, busyScore: number): Promise<Location> {
  const supabase = getDataClient()
  if (!supabase) {
    const mock = mockLocations.find((l) => l.id === locationId)
    if (!mock) throw new Error('Unknown spot')
    mock.busyScore = busyScore
    mock.lastUpdated = new Date().toISOString()
    return { ...mock }
  }

  const { error } = await supabase.from('busy_reports').insert({ location_id: locationId, busy_score: busyScore })
  if (error) throw error
  const { data, error: fetchError } = await supabase
    .from('locations')
    .select(LOCATION_SELECT)
    .eq('id', locationId)
    .single()
  if (fetchError || !data) throw fetchError ?? new Error('Report saved, but the spot could not be refreshed')
  return toLocation(data as LocationRow)
}

// Saved spots live on the device for now; this seam is where account sync would plug in.
const SAVED_KEY = 'spotcheck:saved-spots'

export async function getSavedSpotIds(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(SAVED_KEY).catch(() => null)
  try {
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : []
  } catch {
    return []
  }
}

export async function setSpotSaved(locationId: string, saved: boolean): Promise<string[]> {
  const current = new Set(await getSavedSpotIds())
  if (saved) current.add(locationId)
  else current.delete(locationId)
  const next = [...current]
  await AsyncStorage.setItem(SAVED_KEY, JSON.stringify(next))
  return next
}
