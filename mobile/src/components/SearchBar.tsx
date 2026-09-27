import { Pressable, TextInput, View } from 'react-native'
import { Search, X } from 'lucide-react-native'

interface SearchBarProps {
  value: string
  onChangeText: (value: string) => void
  onFocus: () => void
}

export function SearchBar({ value, onChangeText, onFocus }: SearchBarProps) {
  return (
    <View className="flex-1 flex-row items-center gap-2 rounded-xl border border-neutral-700 bg-neutral-900/95 px-3">
      <Search size={16} color="#a3a3a3" />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onFocus={onFocus}
        placeholder="Search spots or addresses"
        placeholderTextColor="#737373"
        returnKeyType="search"
        autoCorrect={false}
        className="flex-1 py-2.5 text-sm text-neutral-100"
      />
      {value.length > 0 && (
        <Pressable onPress={() => onChangeText('')} accessibilityLabel="Clear search" hitSlop={8}>
          <X size={16} color="#737373" />
        </Pressable>
      )}
    </View>
  )
}
