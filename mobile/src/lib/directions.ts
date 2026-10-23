import { Linking, Platform } from 'react-native'
import type { Location } from '../types/location'

// Walking directions in the platform's maps app (Apple Maps on iOS; Google Maps, or the
// browser if it isn't installed, on Android).
export function openWalkingDirections(location: Location): Promise<void> {
  const destination = `${location.lat},${location.lng}`
  const url =
    Platform.OS === 'ios'
      ? `http://maps.apple.com/?daddr=${destination}&dirflg=w`
      : `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=walking`
  return Linking.openURL(url)
}
