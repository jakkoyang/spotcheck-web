import '../../global.css'
import { useEffect } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { ensureNotificationSetup } from '../lib/checkIns'
import { restoreThemePreference, useThemeColors } from '../lib/theme'

export default function RootLayout() {
  const colors = useThemeColors()
  const headerOptions = {
    headerShown: true,
    headerStyle: { backgroundColor: colors.background },
    headerTintColor: colors.text,
    headerShadowVisible: false,
  }

  useEffect(() => {
    restoreThemePreference()
    // Registers the check-in notification buttons; harmless if notifications are never allowed.
    ensureNotificationSetup().catch(() => {})
  }, [])

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style={colors.isDark ? 'light' : 'dark'} />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="settings" options={{ ...headerOptions, title: 'Settings' }} />
          <Stack.Screen name="check-ins" options={{ ...headerOptions, title: 'Check-in prompts' }} />
          <Stack.Screen name="auth/callback" options={{ animation: 'none' }} />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
