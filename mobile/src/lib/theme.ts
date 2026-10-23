import { useCallback, useEffect, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { colorScheme, useColorScheme } from 'nativewind'

export type ThemePreference = 'system' | 'light' | 'dark'

const STORAGE_KEY = 'spotcheck:theme'

// Applies the saved preference; called once from the root layout at startup.
export async function restoreThemePreference(): Promise<void> {
  const saved = (await AsyncStorage.getItem(STORAGE_KEY).catch(() => null)) as ThemePreference | null
  colorScheme.set(saved ?? 'system')
}

export function useThemePreference(): [ThemePreference, (next: ThemePreference) => void] {
  const [preference, setPreference] = useState<ThemePreference>('system')

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (saved === 'light' || saved === 'dark') setPreference(saved)
      })
      .catch(() => {})
  }, [])

  const update = useCallback((next: ThemePreference) => {
    setPreference(next)
    colorScheme.set(next)
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {})
  }, [])

  return [preference, update]
}

// Raw colors for places Tailwind classes can't reach: icons, native map layers, the sheet background.
const PALETTES = {
  dark: {
    isDark: true,
    background: '#171717',
    surface: '#262626',
    border: '#404040',
    text: '#fafafa',
    textSecondary: '#a3a3a3',
    textMuted: '#737373',
    handle: '#525252',
    accent: '#a78bfa',
    onAccent: '#0a0a0a',
    mapStyle: 'mapbox://styles/mapbox/dark-v11',
  },
  light: {
    isDark: false,
    background: '#ffffff',
    surface: '#f5f5f5',
    border: '#e5e5e5',
    text: '#171717',
    textSecondary: '#525252',
    textMuted: '#737373',
    handle: '#d4d4d4',
    accent: '#7c3aed',
    onAccent: '#ffffff',
    mapStyle: 'mapbox://styles/mapbox/light-v11',
  },
} as const

export type ThemeColors = (typeof PALETTES)[keyof typeof PALETTES]

export function useThemeColors(): ThemeColors {
  const { colorScheme: scheme } = useColorScheme()
  // Light until NativeWind reports dark, matching the screens' default bg-white.
  return scheme === 'dark' ? PALETTES.dark : PALETTES.light
}
