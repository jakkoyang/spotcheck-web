import type { Location } from '../types/location'

export interface Coords {
  lat: number
  lng: number
}

const EARTH_RADIUS_M = 6_371_000
const WALK_METERS_PER_MINUTE = 80 // ~4.8 km/h
// Straight-line distance undercounts real paths around buildings and blocks.
const ROUTE_DETOUR_FACTOR = 1.25

export function distanceMeters(a: Coords, b: Coords): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h))
}

// "6 min walk", or a distance once walking stops being realistic.
export function walkLabel(from: Coords | null, to: Coords): string | null {
  if (!from) return null
  const meters = distanceMeters(from, to)
  const minutes = Math.max(1, Math.round((meters * ROUTE_DETOUR_FACTOR) / WALK_METERS_PER_MINUTE))
  if (minutes <= 60) return `${minutes} min walk`
  const km = meters / 1000
  return km < 100 ? `${km.toFixed(1)} km away` : `${Math.round(km).toLocaleString()} km away`
}

export function sortByDistance(locations: Location[], from: Coords): Location[] {
  return [...locations].sort((a, b) => distanceMeters(from, a) - distanceMeters(from, b))
}
