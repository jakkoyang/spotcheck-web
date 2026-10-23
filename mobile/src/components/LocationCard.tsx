import { ChevronLeft, Heart, Navigation } from 'lucide-react-native'
import { Pressable, Text, View, type LayoutChangeEvent } from 'react-native'
import { BusyPanel } from './BusyStatus'
import { BusyReport } from './BusyReport'
import { busyTierHex, getBusyTier, STALE_HEX } from '../lib/busyTier'
import { CategoryIcon } from './CategoryIcon'
import { getCategoryMeta } from '../lib/categories'
import { getFreshnessLevel } from '../lib/freshness'
import { getOpenStatus } from '../lib/openingHours'
import { useThemeColors } from '../lib/theme'
import type { Location, VibeTag } from '../types/location'

const SAVED_HEX = '#f43f5e' // rose-500

interface LocationCardProps {
  location: Location
  vibeTags: VibeTag[]
  walkLabel: string | null
  saved: boolean
  reportNeedsSignIn: boolean
  onClose: () => void
  onToggleSaved: () => void
  onDirections: () => void
  onReport: (busyScore: number) => Promise<void>
  onSignIn: () => void
  // Reports the card's rendered height so the sheet can fit it exactly.
  onLayout?: (event: LayoutChangeEvent) => void
}

export function LocationCard({
  location,
  vibeTags,
  walkLabel,
  saved,
  reportNeedsSignIn,
  onClose,
  onToggleSaved,
  onDirections,
  onReport,
  onSignIn,
  onLayout,
}: LocationCardProps) {
  const colors = useThemeColors()
  const freshness = getFreshnessLevel(location.lastUpdated)
  const openStatus = getOpenStatus(location.openingHours)
  const tags = vibeTags.filter((tag) => location.vibeTagSlugs.includes(tag.slug))
  const iconColor = freshness === 'stale' ? STALE_HEX : busyTierHex[getBusyTier(location.busyScore)]

  return (
    <View className="gap-4 px-4 pb-4" onLayout={onLayout}>
      <View className="flex-row items-start gap-3">
        <Pressable
          onPress={onClose}
          accessibilityLabel="Back to list"
          hitSlop={8}
          className="-ml-2 mt-2.5 rounded-full p-1 active:bg-neutral-100 dark:active:bg-neutral-800"
        >
          <ChevronLeft size={24} color={colors.textSecondary} />
        </Pressable>
        <View
          className="mt-1 h-12 w-12 items-center justify-center rounded-full"
          style={{ backgroundColor: iconColor }}
        >
          <CategoryIcon category={location.category} size={22} color="#ffffff" strokeWidth={2.2} />
        </View>
        <View className="flex-1 gap-0.5">
          <Text className="text-title font-bold text-neutral-900 dark:text-neutral-50">{location.name}</Text>
          <Text className="text-footnote text-neutral-500 dark:text-neutral-400" numberOfLines={1}>
            {[getCategoryMeta(location.category).label, walkLabel].filter(Boolean).join(' · ')}
          </Text>
        </View>
      </View>

      <BusyPanel location={location} />

      <View className="gap-1">
        <Text
          className={`text-body font-medium ${
            !openStatus
              ? 'text-neutral-500'
              : openStatus.isOpen
                ? 'text-violet-600 dark:text-violet-400'
                : 'text-rose-600 dark:text-rose-400'
          }`}
        >
          {openStatus?.label ?? 'Hours not listed'}
        </Text>
        <Text className="text-footnote text-neutral-500 dark:text-neutral-400" numberOfLines={1}>
          {location.address.replace(', Madison, WI', '')}
        </Text>
      </View>

      <View className="flex-row flex-wrap gap-1.5">
        <View className="rounded-full bg-neutral-900 px-3 py-1.5 dark:bg-neutral-100">
          <Text className="text-caption font-semibold text-white dark:text-neutral-900">{location.atmosphereScore}</Text>
        </View>
        {tags.map((tag) => (
          <View key={tag.id} className="rounded-full bg-neutral-100 px-3 py-1.5 dark:bg-neutral-800">
            <Text className="text-caption font-medium text-neutral-700 dark:text-neutral-300">{tag.label}</Text>
          </View>
        ))}
      </View>

      <View className="flex-row gap-2">
        <Pressable
          onPress={onDirections}
          accessibilityRole="button"
          className="flex-1 flex-row items-center justify-center gap-2 rounded-full bg-violet-600 py-3 active:bg-violet-700"
        >
          <Navigation size={17} color="#ffffff" />
          <Text className="text-body font-semibold text-white">Directions</Text>
        </Pressable>
        <Pressable
          onPress={onToggleSaved}
          accessibilityRole="button"
          accessibilityState={{ selected: saved }}
          className={`flex-row items-center justify-center gap-2 rounded-full border px-5 py-3 ${
            saved
              ? 'border-rose-300 bg-rose-50 dark:border-rose-800 dark:bg-rose-950/50'
              : 'border-neutral-300 active:bg-neutral-100 dark:border-neutral-700 dark:active:bg-neutral-800'
          }`}
        >
          <Heart size={17} color={saved ? SAVED_HEX : colors.textSecondary} fill={saved ? SAVED_HEX : 'transparent'} />
          <Text className={`text-body font-medium ${saved ? 'text-rose-600 dark:text-rose-300' : 'text-neutral-700 dark:text-neutral-200'}`}>
            {saved ? 'Saved' : 'Save'}
          </Text>
        </Pressable>
      </View>

      <View className="h-px bg-neutral-200 dark:bg-neutral-800" />

      <BusyReport key={location.id} onSubmit={onReport} needsSignIn={reportNeedsSignIn} onSignIn={onSignIn} />
    </View>
  )
}
