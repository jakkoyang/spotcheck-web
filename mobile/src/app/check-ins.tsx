import { useState } from 'react'
import { ActivityIndicator, Linking, Pressable, ScrollView, Text, View } from 'react-native'
import { router } from 'expo-router'
import { Bell, Clock, MapPin, ShieldCheck } from 'lucide-react-native'
import { enableCheckIns, syncCheckIns, type CheckInEnableResult } from '../lib/checkIns'
import { getLocations } from '../lib/data'
import { useThemeColors } from '../lib/theme'

const POINTS = [
  {
    Icon: MapPin,
    title: 'Notices where you study',
    body: 'When you have spent about 5 minutes at a SpotCheck spot, you get one notification.',
  },
  {
    Icon: Bell,
    title: 'One tap to answer',
    body: 'Pick Empty, Busy or Packed right from the notification. Everyone sees a fresher map.',
  },
  {
    Icon: Clock,
    title: 'Never pushy',
    body: 'At most 3 a day, never the same spot twice in 3 hours, and nothing from 10 PM to 8 AM.',
  },
  {
    Icon: ShieldCheck,
    title: 'Your location stays on your phone',
    body: 'SpotCheck only uploads the report you choose to send, never where you have been.',
  },
]

const FAILURE_MESSAGES: Record<Exclude<CheckInEnableResult, 'enabled'>, string> = {
  unavailable: "This device can't watch for spots in the background.",
  'location-denied': 'Check-ins need location access. You can allow it in Settings.',
  'background-denied': 'Check-ins need location set to "Always" (Allow all the time) in Settings.',
  'accuracy-off': 'Check-ins need Google Location Accuracy turned on (Settings → Location).',
  'notifications-denied': 'Check-ins need notifications. You can allow them in Settings.',
}

// Explains check-in prompts before any system permission dialog appears, then asks for them.
export default function CheckInsScreen() {
  const colors = useThemeColors()
  const [pending, setPending] = useState(false)
  const [failure, setFailure] = useState<Exclude<CheckInEnableResult, 'enabled'> | null>(null)

  const turnOn = async () => {
    setFailure(null)
    setPending(true)
    try {
      const result = await enableCheckIns()
      if (result !== 'enabled') {
        setFailure(result)
        return
      }
      await syncCheckIns(await getLocations(), null)
      router.back()
    } finally {
      setPending(false)
    }
  }

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" className="flex-1 bg-white dark:bg-neutral-900" contentContainerClassName="gap-6 px-5 pb-10 pt-4">
      <View className="gap-2">
        <Text className="text-title font-bold text-neutral-900 dark:text-neutral-50">Help keep the map fresh</Text>
        <Text className="text-body text-neutral-600 dark:text-neutral-400">
          Check-in prompts ask how busy a spot is while you are there, so the next person knows before they walk over.
        </Text>
      </View>

      <View className="gap-4">
        {POINTS.map(({ Icon, title, body }) => (
          <View key={title} className="flex-row gap-3">
            <View className="h-10 w-10 items-center justify-center rounded-full bg-violet-50 dark:bg-violet-950">
              <Icon size={19} color={colors.accent} />
            </View>
            <View className="flex-1 gap-0.5">
              <Text className="text-body font-semibold text-neutral-900 dark:text-neutral-50">{title}</Text>
              <Text className="text-footnote text-neutral-600 dark:text-neutral-400">{body}</Text>
            </View>
          </View>
        ))}
      </View>

      <Text className="text-footnote text-neutral-500 dark:text-neutral-400">
        Your phone will ask for location access first, then to allow it all the time, then for notifications. You can
        turn check-ins off any time in Settings.
      </Text>

      {failure && (
        <View className="gap-2 rounded-xl bg-rose-50 p-4 dark:bg-rose-950/50">
          <Text className="text-footnote text-rose-700 dark:text-rose-300">{FAILURE_MESSAGES[failure]}</Text>
          {failure !== 'unavailable' && (
            <Pressable onPress={() => Linking.openSettings()} hitSlop={8}>
              <Text className="text-footnote font-semibold text-rose-700 dark:text-rose-300">Open Settings</Text>
            </Pressable>
          )}
        </View>
      )}

      <View className="gap-2">
        <Pressable
          onPress={turnOn}
          disabled={pending}
          accessibilityRole="button"
          className="h-12 items-center justify-center rounded-full bg-violet-600 active:bg-violet-700"
        >
          {pending ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text className="text-body font-semibold text-white">Turn on check-in prompts</Text>
          )}
        </Pressable>
        <Pressable onPress={() => router.back()} className="h-12 items-center justify-center rounded-full">
          <Text className="text-body font-medium text-neutral-600 dark:text-neutral-300">Not now</Text>
        </Pressable>
      </View>
    </ScrollView>
  )
}
