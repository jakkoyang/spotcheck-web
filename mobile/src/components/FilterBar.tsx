import { useState, type ReactNode } from 'react'
import { ScrollView, View } from 'react-native'
import { ChevronDown, Clock, Heart, Sparkles } from 'lucide-react-native'
import { categoryFilters, type CategoryFilterId } from '../lib/spotFilters'
import { useThemeColors } from '../lib/theme'
import type { VibeTag } from '../types/location'
import { Chip } from './Chip'
import { VibePicker } from './VibePicker'

const Divider = () => <View className="mx-1 h-5 w-px bg-neutral-400/60 dark:bg-neutral-600" />

interface FilterBarProps {
  categoryId: CategoryFilterId
  onCategoryChange: (categoryId: CategoryFilterId) => void
  openNow: boolean
  onToggleOpenNow: () => void
  savedOnly: boolean
  onToggleSavedOnly: () => void
  vibeTags: VibeTag[]
  selectedVibeSlugs: string[]
  onToggleVibe: (slug: string) => void
  onClearVibes: () => void
  // Pinned after the scrolling chips (e.g. the locate button), so it's always on screen.
  trailing?: ReactNode
}

// One horizontally scrolling chip row, like Google Maps: single-select categories, then
// Open now / Saved toggles, then a Vibes chip that opens the multi-select vibe picker,
// with an optional fixed control at the end of the row.
export function FilterBar({
  categoryId,
  onCategoryChange,
  openNow,
  onToggleOpenNow,
  savedOnly,
  onToggleSavedOnly,
  vibeTags,
  selectedVibeSlugs,
  onToggleVibe,
  onClearVibes,
  trailing,
}: FilterBarProps) {
  const colors = useThemeColors()
  const [vibesOpen, setVibesOpen] = useState(false)
  const toggleIconColor = (active: boolean) => (active ? colors.onAccent : colors.textSecondary)
  const vibeCount = selectedVibeSlugs.length

  return (
    <>
      <View className="-mx-3 flex-row items-center pr-3">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          className="flex-1"
          // Vertical padding keeps the chip shadows from being clipped by the scroll view.
          contentContainerClassName="items-center gap-2 px-3 py-1"
        >
          {categoryFilters.map((filter) => (
            <Chip
              key={filter.id}
              active={categoryId === filter.id}
              onPress={() => onCategoryChange(filter.id)}
              label={filter.label}
            />
          ))}
          <Divider />
          <Chip
            active={openNow}
            onPress={onToggleOpenNow}
            label="Open now"
            icon={<Clock size={13} color={toggleIconColor(openNow)} />}
          />
          <Chip
            active={savedOnly}
            onPress={onToggleSavedOnly}
            label="Saved"
            icon={<Heart size={13} color={toggleIconColor(savedOnly)} fill={savedOnly ? colors.onAccent : 'transparent'} />}
          />
          {vibeTags.length > 0 && (
            <Chip
              active={vibeCount > 0}
              onPress={() => setVibesOpen(true)}
              label={vibeCount > 0 ? `Vibes · ${vibeCount}` : 'Vibes'}
              icon={<Sparkles size={13} color={toggleIconColor(vibeCount > 0)} />}
              trailing={<ChevronDown size={14} color={toggleIconColor(vibeCount > 0)} />}
            />
          )}
        </ScrollView>
        {trailing}
      </View>
      <VibePicker
        visible={vibesOpen}
        vibeTags={vibeTags}
        selectedVibeSlugs={selectedVibeSlugs}
        onToggleVibe={onToggleVibe}
        onClear={onClearVibes}
        onClose={() => setVibesOpen(false)}
      />
    </>
  )
}
