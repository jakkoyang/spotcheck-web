import { useEffect } from 'react'
import { ActivityIndicator, View } from 'react-native'
import { router } from 'expo-router'

// The OAuth redirect (spotcheck://auth/callback) also reaches Expo Router as a deep link.
// signInWithProvider creates the session from that URL, so this screen only returns the
// user to where they started.
export default function AuthCallbackScreen() {
  useEffect(() => {
    if (router.canGoBack()) router.back()
    else router.replace('/settings')
  }, [])

  return (
    <View className="flex-1 items-center justify-center bg-neutral-900">
      <ActivityIndicator color="#a3a3a3" />
    </View>
  )
}
