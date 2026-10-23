import { useState } from 'react'
import { ActivityIndicator, Linking, Pressable, ScrollView, Text, View } from 'react-native'
import * as AppleAuthentication from 'expo-apple-authentication'
import { ExternalLink, LogOut, Moon, Smartphone, Sun } from 'lucide-react-native'
import { signInWithProvider, signOut, usesNativeAppleSignIn, useSession, type OAuthProvider } from '../lib/auth'
import { useThemeColors, useThemePreference, type ThemePreference } from '../lib/theme'

const PROVIDERS: { id: OAuthProvider; label: string; buttonClass: string; textClass: string; spinner: string }[] = [
  {
    id: 'google',
    label: 'Continue with Google',
    buttonClass: 'border-neutral-300 bg-white',
    textClass: 'text-neutral-900',
    spinner: '#171717',
  },
  {
    id: 'apple',
    label: 'Continue with Apple',
    buttonClass: 'border-neutral-900 bg-black dark:border-neutral-600',
    textClass: 'text-white',
    spinner: '#ffffff',
  },
]

const THEME_OPTIONS: { value: ThemePreference; label: string; Icon: typeof Sun }[] = [
  { value: 'system', label: 'System', Icon: Smartphone },
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'dark', label: 'Dark', Icon: Moon },
]

const ABOUT_LINKS = [
  { label: '© Mapbox', url: 'https://www.mapbox.com/about/maps/' },
  { label: '© OpenStreetMap contributors', url: 'https://www.openstreetmap.org/copyright' },
  { label: 'Improve this map', url: 'https://www.mapbox.com/map-feedback/' },
]

function SectionLabel({ children }: { children: string }) {
  return (
    <Text className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wide text-neutral-500">{children}</Text>
  )
}

export default function SettingsScreen() {
  const colors = useThemeColors()
  const { session, loading } = useSession()
  const [themePreference, setThemePreference] = useThemePreference()
  const [pendingProvider, setPendingProvider] = useState<OAuthProvider | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSignIn = async (provider: OAuthProvider) => {
    setError(null)
    setPendingProvider(provider)
    try {
      await signInWithProvider(provider)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't sign in. Try again.")
    } finally {
      setPendingProvider(null)
    }
  }

  const user = session?.user
  const displayName = (user?.user_metadata?.full_name as string | undefined) ?? user?.email ?? 'Signed in'
  const provider = user?.app_metadata?.provider as string | undefined

  return (
    <ScrollView className="flex-1 bg-white dark:bg-neutral-900" contentContainerClassName="px-4 pb-10">
      <SectionLabel>Account</SectionLabel>
      {loading ? (
        <View className="items-center rounded-xl border border-neutral-200 py-6 dark:border-neutral-800">
          <ActivityIndicator color={colors.textSecondary} />
        </View>
      ) : user ? (
        <View className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-800/60">
          <View className="flex-row items-center gap-3">
            <View className="h-10 w-10 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-950">
              <Text className="text-base font-semibold text-violet-700 dark:text-violet-300">
                {displayName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="text-sm font-semibold text-neutral-900 dark:text-neutral-50" numberOfLines={1}>
                {displayName}
              </Text>
              <Text className="text-xs capitalize text-neutral-500 dark:text-neutral-400" numberOfLines={1}>
                {user.email && user.email !== displayName ? `${user.email} · ` : ''}
                {provider ? `via ${provider}` : ''}
              </Text>
            </View>
          </View>
          <Pressable
            onPress={signOut}
            className="mt-4 flex-row items-center justify-center gap-2 rounded-lg border border-neutral-300 py-2.5 dark:border-neutral-700"
          >
            <LogOut size={16} color={colors.textSecondary} />
            <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-200">Sign out</Text>
          </Pressable>
        </View>
      ) : (
        <View className="gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-800/60">
          <View>
            <Text className="text-base font-semibold text-neutral-900 dark:text-neutral-50">Sign in to SpotCheck</Text>
            <Text className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">
              Report how busy spots are with your Google or Apple account.
            </Text>
          </View>
          {PROVIDERS.map((p) =>
            p.id === 'apple' && usesNativeAppleSignIn ? (
              // App Review requires Apple's own button for the native flow; it sizes only via style.
              <AppleAuthentication.AppleAuthenticationButton
                key={p.id}
                buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
                buttonStyle={
                  colors.isDark
                    ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
                    : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
                }
                cornerRadius={8}
                style={{ height: 48, width: '100%', opacity: pendingProvider ? 0.5 : 1 }}
                onPress={() => {
                  if (!pendingProvider) handleSignIn(p.id)
                }}
              />
            ) : (
              <Pressable
                key={p.id}
                onPress={() => handleSignIn(p.id)}
                disabled={pendingProvider !== null}
                accessibilityRole="button"
                className={`h-12 flex-row items-center justify-center rounded-lg border ${p.buttonClass} ${
                  pendingProvider && pendingProvider !== p.id ? 'opacity-50' : ''
                }`}
              >
                {pendingProvider === p.id ? (
                  <ActivityIndicator color={p.spinner} />
                ) : (
                  <Text className={`text-sm font-semibold ${p.textClass}`}>{p.label}</Text>
                )}
              </Pressable>
            ),
          )}
          {error && <Text className="text-sm text-rose-600 dark:text-rose-400">{error}</Text>}
        </View>
      )}

      <SectionLabel>Appearance</SectionLabel>
      <View className="flex-row gap-1 rounded-xl bg-neutral-100 p-1 dark:bg-neutral-800">
        {THEME_OPTIONS.map(({ value, label, Icon }) => {
          const active = themePreference === value
          return (
            <Pressable
              key={value}
              onPress={() => setThemePreference(value)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              className={`flex-1 flex-row items-center justify-center gap-1.5 rounded-lg py-2 ${
                active ? 'bg-white dark:bg-neutral-700' : ''
              }`}
            >
              <Icon size={15} color={active ? colors.text : colors.textSecondary} />
              <Text
                className={`text-sm font-medium ${
                  active ? 'text-neutral-900 dark:text-neutral-50' : 'text-neutral-500 dark:text-neutral-400'
                }`}
              >
                {label}
              </Text>
            </Pressable>
          )
        })}
      </View>

      <SectionLabel>About</SectionLabel>
      <View className="rounded-xl border border-neutral-200 dark:border-neutral-800">
        <View className="border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
          <Text className="text-sm font-medium text-neutral-900 dark:text-neutral-100">Map data</Text>
          <Text className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
            Maps powered by Mapbox. Opening hours from OpenStreetMap.
          </Text>
        </View>
        {ABOUT_LINKS.map((link, i) => (
          <Pressable
            key={link.url}
            onPress={() => Linking.openURL(link.url)}
            className={`flex-row items-center justify-between px-4 py-3 ${
              i < ABOUT_LINKS.length - 1 ? 'border-b border-neutral-200 dark:border-neutral-800' : ''
            }`}
          >
            <Text className="text-sm text-neutral-700 dark:text-neutral-300">{link.label}</Text>
            <ExternalLink size={14} color={colors.textMuted} />
          </Pressable>
        ))}
      </View>
    </ScrollView>
  )
}
