import { Pressable, TextInput, View } from 'react-native'
import { Search, X } from 'lucide-react-native'
import { floatingShadow } from '../lib/elevation'
import { useThemeColors } from '../lib/theme'

interface SearchBarProps {
  value: string
  onChangeText: (value: string) => void
  onFocus: () => void
}

export function SearchBar({ value, onChangeText, onFocus }: SearchBarProps) {
  const colors = useThemeColors()
  return (
    <View
      className="h-12 flex-1 flex-row items-center gap-2.5 rounded-full border border-transparent bg-white px-4 dark:border-neutral-700 dark:bg-neutral-900"
      style={floatingShadow}
    >
      <Search size={18} color={colors.textSecondary} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onFocus={onFocus}
        placeholder="Search spots or addresses"
        placeholderTextColor={colors.textMuted}
        returnKeyType="search"
        autoCorrect={false}
        className="flex-1 py-3 text-body text-neutral-900 dark:text-neutral-100"
      />
      {value.length > 0 && (
        <Pressable onPress={() => onChangeText('')} accessibilityLabel="Clear search" hitSlop={8}>
          <X size={18} color={colors.textMuted} />
        </Pressable>
      )}
    </View>
  )
}
