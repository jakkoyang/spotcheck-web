import { Pressable, Text, View } from 'react-native'
import { BusyBadge } from './BusyStatus'
import { busyTierHex, getBusyTier, STALE_HEX } from '../lib/busyTier'
import { CategoryIcon } from './CategoryIcon'
import { getCategoryMeta } from '../lib/categories'
import { getFreshnessLabel, getFreshnessLevel } from '../lib/freshness'
import { getOpenStatus } from '../lib/openingHours'
import type { Location } from '../types/location'

interface LocationListItemProps {
  location: Location
  walkLabel?: string | null
  onPress?: () => void
}

export function LocationListItem({ location, walkLabel, onPress }: LocationListItemProps) {
  const freshness = getFreshnessLevel(location.lastUpdated)
  const openStatus = getOpenStatus(location.openingHours)
  const subtitle = [getCategoryMeta(location.category).label, walkLabel].filter(Boolean).join(' · ')
  // Same color as the spot's map pin, so a row and its pin read as one thing.
  const iconColor = freshness === 'stale' ? STALE_HEX : busyTierHex[getBusyTier(location.busyScore)]

  return (
    <Pressable
      onPress={onPress}
      className="w-full flex-row items-center gap-3 px-4 py-3 active:bg-neutral-100 dark:active:bg-neutral-800"
    >
      <View
        className="h-11 w-11 items-center justify-center rounded-full"
        style={{ backgroundColor: iconColor }}
      >
        <CategoryIcon category={location.category} size={20} color="#ffffff" strokeWidth={2.2} />
      </View>
      <View className="flex-1 gap-0.5">
        <Text className="text-body font-semibold text-neutral-900 dark:text-neutral-50" numberOfLines={1}>
          {location.name}
        </Text>
        <Text className="text-footnote text-neutral-500 dark:text-neutral-400" numberOfLines={1}>
          {subtitle}
        </Text>
        <Text className="text-caption text-neutral-500 dark:text-neutral-400" numberOfLines={1}>
          {openStatus && (
            <Text
              className={`font-medium ${
                openStatus.isOpen ? 'text-violet-600 dark:text-violet-400' : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {openStatus.isOpen ? 'Open' : 'Closed'}
              {' · '}
            </Text>
          )}
          {getFreshnessLabel(location.lastUpdated).replace(' · may be out of date', '')}
        </Text>
      </View>
      <BusyBadge location={location} />
    </Pressable>
  )
}
