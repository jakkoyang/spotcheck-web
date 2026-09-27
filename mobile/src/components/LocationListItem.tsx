import { Pressable, Text, View } from 'react-native'
import { busyTierColors, busyTierDescriptor, getBusyTier } from '../lib/busyTier'
import { getFreshnessLabel } from '../lib/freshness'
import type { Location } from '../types/location'

interface LocationListItemProps {
  location: Location
  onPress?: () => void
}

export function LocationListItem({ location, onPress }: LocationListItemProps) {
  const tier = getBusyTier(location.busyScore)

  return (
    <Pressable
      onPress={onPress}
      className="flex-row w-full items-center justify-between gap-3 rounded-xl border border-neutral-700 bg-neutral-800/60 px-4 py-3"
    >
      <View className="flex-1">
        <Text className="text-sm font-semibold text-neutral-50">{location.name}</Text>
        <Text className="text-xs capitalize text-neutral-400">{location.category}</Text>
      </View>
      <View className="shrink-0 items-end gap-1">
        <View className="flex-row items-center gap-1.5">
          <View className={`h-2 w-2 rounded-full ${busyTierColors[tier].bar}`} />
          <Text className={`text-xs font-medium ${busyTierColors[tier].text}`}>
            {busyTierDescriptor[tier]}
          </Text>
        </View>
        <Text className="text-xs text-neutral-500">{getFreshnessLabel(location.lastUpdated)}</Text>
      </View>
    </Pressable>
  )
}
