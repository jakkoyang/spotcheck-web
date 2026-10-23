import { Modal, Pressable, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { VibeTag } from '../types/location'
import { Chip } from './Chip'

interface VibePickerProps {
  visible: boolean
  vibeTags: VibeTag[]
  selectedVibeSlugs: string[]
  onToggleVibe: (slug: string) => void
  onClear: () => void
  onClose: () => void
}

// Multi-select vibe filter in a modal sheet, so the chip row above the map stays short.
// Toggles apply immediately; the map and list update behind the sheet.
export function VibePicker({ visible, vibeTags, selectedVibeSlugs, onToggleVibe, onClear, onClose }: VibePickerProps) {
  const insets = useSafeAreaInsets()
  const count = selectedVibeSlugs.length

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable className="flex-1 bg-black/40" onPress={onClose} accessibilityLabel="Close vibes" />
      <View
        className="gap-4 rounded-t-3xl bg-white px-4 pt-5 dark:bg-neutral-900"
        style={{ paddingBottom: insets.bottom + 16 }}
      >
        <View className="flex-row items-center justify-between">
          <Text className="text-headline font-bold text-neutral-900 dark:text-neutral-50">Vibes</Text>
          {count > 0 && (
            <Pressable onPress={onClear} hitSlop={8}>
              <Text className="text-body font-medium text-violet-600 dark:text-violet-400">Clear</Text>
            </Pressable>
          )}
        </View>
        <View className="flex-row flex-wrap gap-2">
          {vibeTags.map((tag) => (
            <Chip
              key={tag.id}
              floating={false}
              active={selectedVibeSlugs.includes(tag.slug)}
              onPress={() => onToggleVibe(tag.slug)}
              label={tag.label}
            />
          ))}
        </View>
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          className="items-center rounded-full bg-violet-600 py-3 active:bg-violet-700"
        >
          <Text className="text-body font-semibold text-white">
            {count > 0 ? `Show spots with ${count} ${count === 1 ? 'vibe' : 'vibes'}` : 'Done'}
          </Text>
        </Pressable>
      </View>
    </Modal>
  )
}
