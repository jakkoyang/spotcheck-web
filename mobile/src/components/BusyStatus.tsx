import { Text, View } from 'react-native'
import { busyTierColors, busyTierDescriptor, busyTierHex, getBusyTier, STALE_HEX } from '../lib/busyTier'
import { getFreshnessLabel, getFreshnessLevel } from '../lib/freshness'
import type { Location } from '../types/location'

const METER_SEGMENTS = 10

// Pill for list rows: tier color, dot and descriptor. Reports too old to trust go neutral.
export function BusyBadge({ location }: { location: Location }) {
  const tier = getBusyTier(location.busyScore)
  const freshness = getFreshnessLevel(location.lastUpdated)

  if (freshness === 'stale') {
    return (
      <View className="rounded-full bg-neutral-100 px-2.5 py-1 dark:bg-neutral-800">
        <Text className="text-caption font-medium text-neutral-500 dark:text-neutral-400">No reports</Text>
      </View>
    )
  }

  return (
    <View
      className={`flex-row items-center gap-1.5 rounded-full px-2.5 py-1 ${busyTierColors[tier].soft}`}
    >
      <View className={`h-2 w-2 rounded-full ${busyTierColors[tier].bar}`} />
      <Text className={`text-caption font-semibold ${busyTierColors[tier].onSoft}`}>{busyTierDescriptor[tier]}</Text>
    </View>
  )
}

// Spot card panel: big descriptor, a 10-segment meter of the 0-10 score, and how fresh the reading is.
export function BusyPanel({ location }: { location: Location }) {
  const tier = getBusyTier(location.busyScore)
  const freshness = getFreshnessLevel(location.lastUpdated)
  const stale = freshness === 'stale'
  const fill = stale ? STALE_HEX : busyTierHex[tier]
  const filled = Math.round(location.busyScore)

  return (
    <View
      className={`gap-3 rounded-2xl p-4 ${stale ? 'bg-neutral-100 dark:bg-neutral-800' : busyTierColors[tier].soft}`}
    >
      <View className="flex-row items-baseline justify-between gap-2">
        <Text
          className={`text-headline font-bold ${stale ? 'text-neutral-600 dark:text-neutral-300' : busyTierColors[tier].onSoft}`}
        >
          {stale ? 'No recent reports' : busyTierDescriptor[tier]}
        </Text>
        {!stale && (
          <Text className={`text-footnote font-semibold ${busyTierColors[tier].onSoft}`}>{filled}/10</Text>
        )}
      </View>
      <View
        className="flex-row gap-1"
        accessibilityLabel={`Busy score ${filled} out of 10`}
      >
        {Array.from({ length: METER_SEGMENTS }, (_, i) => (
          <View
            key={i}
            className="h-2 flex-1 rounded-full bg-black/10 dark:bg-white/15"
            style={!stale && i < filled ? { backgroundColor: fill } : undefined}
          />
        ))}
      </View>
      <Text className="text-caption text-neutral-600 dark:text-neutral-400">{getFreshnessLabel(location.lastUpdated)}</Text>
    </View>
  )
}
