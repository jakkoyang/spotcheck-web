import type { LocationRegion } from 'expo-location'
import { distanceMeters, type Coords } from '../distance'
import type { CheckInSpot } from './rules'

// iOS can only watch 20 regions at once (Android allows 100); use the same cap on both so
// they behave alike. The set is re-picked around the user as they move.
export const MAX_REGIONS = 20
// iOS region monitoring isn't reliable below about 100 m.
export const REGION_RADIUS_M = 100
// Re-pick the watched set only once the user is this far from where it was last picked.
// Re-registering makes the OS report an initial exit for every circle the user is outside, so
// re-picking on any exit would loop (and drain the battery).
export const REPICK_DISTANCE_M = 400

// Regions for the spots nearest `center`, identified by spot id.
export function pickRegions(spots: CheckInSpot[], center: Coords): LocationRegion[] {
  return [...spots]
    .sort((a, b) => distanceMeters(center, a) - distanceMeters(center, b))
    .slice(0, MAX_REGIONS)
    .map((spot) => ({
      identifier: spot.id,
      latitude: spot.lat,
      longitude: spot.lng,
      radius: REGION_RADIUS_M,
      notifyOnEnter: true,
      notifyOnExit: true,
    }))
}
