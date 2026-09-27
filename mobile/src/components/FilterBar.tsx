import { useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { SlidersHorizontal } from 'lucide-react-native'
import { categoryFilters, type CategoryFilterId } from '../lib/spotFilters'
import type { VibeTag } from '../types/location'

function Chip({
  active,
  onPress,
  label,
  children,
  accessibilityLabel,
}: {
  active: boolean
  onPress: () => void
  label?: string
  children?: React.ReactNode
  accessibilityLabel?: string
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={accessibilityLabel}
      className={`flex-row items-center gap-1 rounded-full border px-3 py-1.5 ${
        active ? 'border-emerald-400 bg-emerald-950' : 'border-neutral-700 bg-neutral-900'
      }`}
    >
      {children}
      {label !== undefined && (
        <Text className={`text-xs font-medium ${active ? 'text-emerald-300' : 'text-neutral-300'}`}>
          {label}
        </Text>
      )}
    </Pressable>
  )
}

interface FilterBarProps {
  categoryId: CategoryFilterId
  onCategoryChange: (categoryId: CategoryFilterId) => void
  vibeTags: VibeTag[]
  selectedVibeSlugs: string[]
  onToggleVibe: (slug: string) => void
}

export function FilterBar({
  categoryId,
  onCategoryChange,
  vibeTags,
  selectedVibeSlugs,
  onToggleVibe,
}: FilterBarProps) {
  const [showVibes, setShowVibes] = useState(false)
  const vibeCount = selectedVibeSlugs.length
  const vibesActive = showVibes || vibeCount > 0

  return (
    <View className="gap-2">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        className="-mx-3"
        contentContainerClassName="gap-2 px-3"
      >
        <Chip
          active={vibesActive}
          onPress={() => setShowVibes((current) => !current)}
          label={vibeCount > 0 ? String(vibeCount) : undefined}
          accessibilityLabel="Vibe filters"
        >
          <SlidersHorizontal size={14} color={vibesActive ? '#6ee7b7' : '#d4d4d4'} />
        </Chip>
        {categoryFilters.map((filter) => (
          <Chip
            key={filter.id}
            active={categoryId === filter.id}
            onPress={() => onCategoryChange(filter.id)}
            label={filter.label}
          />
        ))}
      </ScrollView>

      {showVibes && (
        <View className="flex-row flex-wrap gap-2">
          {vibeTags.map((tag) => (
            <Chip
              key={tag.id}
              active={selectedVibeSlugs.includes(tag.slug)}
              onPress={() => onToggleVibe(tag.slug)}
              label={tag.label}
            />
          ))}
        </View>
      )}
    </View>
  )
}
