import { ChevronLeft } from 'lucide-react-native'
import { Pressable, Text, View } from 'react-native'
import { busyTierColors, busyTierDescriptor, getBusyTier } from '../lib/busyTier'
import { getFreshnessLabel } from '../lib/freshness'
import type { Location, VibeTag } from '../types/location'

interface LocationCardProps {
  location: Location
  vibeTags: VibeTag[]
  onClose: () => void
}

export function LocationCard({ location, vibeTags, onClose }: LocationCardProps) {
  const tier = getBusyTier(location.busyScore)
  const tags = vibeTags.filter((tag) => location.vibeTagSlugs.includes(tag.slug))

  return (
    <View className="px-4 pb-4">
      <View className="flex-row items-start gap-2">
        <Pressable
          onPress={onClose}
          accessibilityLabel="Back to list"
          hitSlop={8}
          className="-ml-1.5 rounded-full p-1"
        >
          <ChevronLeft size={22} color="#a3a3a3" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-lg font-semibold text-neutral-50">{location.name}</Text>
          <Text className="text-sm text-neutral-400">{location.address}</Text>
        </View>
      </View>

      <View className="mt-4">
        <View className="h-2 w-full overflow-hidden rounded-full bg-neutral-700">
          <View
            className={`h-2 rounded-full ${busyTierColors[tier].bar}`}
            style={{ width: `${location.busyScore * 10}%` }}
          />
        </View>
        <Text className={`mt-1.5 text-sm font-medium ${busyTierColors[tier].text}`}>
          {busyTierDescriptor[tier]}
        </Text>
      </View>

      <View className="mt-3 self-start rounded-full border border-neutral-600 bg-neutral-700/60 px-2.5 py-0.5">
        <Text className="text-xs font-medium text-neutral-200">{location.atmosphereScore}</Text>
      </View>

      <View className="mt-3 flex-row flex-wrap gap-1.5">
        {tags.map((tag) => (
          <View key={tag.id} className="rounded-full border border-neutral-700 bg-neutral-900/60 px-2.5 py-1">
            <Text className="text-xs text-neutral-300">{tag.label}</Text>
          </View>
        ))}
      </View>

      <Text className="mt-3 text-xs text-neutral-500">{getFreshnessLabel(location.lastUpdated)}</Text>
    </View>
  )
}
