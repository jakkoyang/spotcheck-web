import type { Location, VibeTag } from '../types/location'
import { mockLocations, mockVibeTags } from './mockData'

export async function getLocations(): Promise<Location[]> {
  return mockLocations
}

export async function getVibeTags(): Promise<VibeTag[]> {
  return mockVibeTags
}
