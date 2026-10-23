import { useCallback, useEffect, useState } from 'react'
import * as ExpoLocation from 'expo-location'
import type { Coords } from './distance'

export type LocationPermission = 'unknown' | 'granted' | 'denied'

// Foreground location for walking times and the "my location" button. Never prompts on its
// own: `request()` is called from a user action (the locate button or the Nearest sort).
export function useUserLocation() {
  const [permission, setPermission] = useState<LocationPermission>('unknown')
  const [coords, setCoords] = useState<Coords | null>(null)

  useEffect(() => {
    ExpoLocation.getForegroundPermissionsAsync().then((result) => {
      if (result.granted) setPermission('granted')
      else if (!result.canAskAgain) setPermission('denied')
    })
  }, [])

  useEffect(() => {
    if (permission !== 'granted') return
    let subscription: ExpoLocation.LocationSubscription | null = null
    let cancelled = false
    ExpoLocation.watchPositionAsync(
      // Don't pop Google's "Location Accuracy" consent dialog just for walking times.
      { accuracy: ExpoLocation.Accuracy.Balanced, distanceInterval: 20, mayShowUserSettingsDialog: false },
      (position) => setCoords({ lat: position.coords.latitude, lng: position.coords.longitude }),
    ).then((sub) => {
      if (cancelled) sub.remove()
      else subscription = sub
    })
    return () => {
      cancelled = true
      subscription?.remove()
    }
  }, [permission])

  // Resolves with the current position, asking for permission first if needed.
  const request = useCallback(async (): Promise<Coords | null> => {
    const result = await ExpoLocation.requestForegroundPermissionsAsync()
    setPermission(result.granted ? 'granted' : 'denied')
    if (!result.granted) return null
    const position =
      (await ExpoLocation.getLastKnownPositionAsync()) ??
      (await ExpoLocation.getCurrentPositionAsync({
        accuracy: ExpoLocation.Accuracy.Balanced,
        mayShowUserSettingsDialog: false,
      }))
    const next = { lat: position.coords.latitude, lng: position.coords.longitude }
    setCoords(next)
    return next
  }, [])

  return { permission, coords, request }
}
