import type { ReactNode } from 'react'
import { Pressable, Text } from 'react-native'
import { chipShadow } from '../lib/elevation'

export function Chip({
  active,
  onPress,
  label,
  icon,
  trailing,
  floating = true,
}: {
  active: boolean
  onPress: () => void
  label: string
  icon?: ReactNode
  trailing?: ReactNode
  // Chips over the map get a shadow; chips on a sheet get a border instead.
  floating?: boolean
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      className={`flex-row items-center gap-1.5 rounded-full border px-3.5 py-2 ${
        active
          ? 'border-violet-600 bg-violet-600 dark:border-violet-500 dark:bg-violet-500'
          : floating
            ? 'border-transparent bg-white dark:border-neutral-700 dark:bg-neutral-900'
            : 'border-neutral-300 bg-white dark:border-neutral-700 dark:bg-neutral-900'
      }`}
      style={floating ? chipShadow : undefined}
    >
      {icon}
      <Text
        className={`text-footnote font-medium ${
          active ? 'text-white dark:text-neutral-950' : 'text-neutral-800 dark:text-neutral-200'
        }`}
      >
        {label}
      </Text>
      {trailing}
    </Pressable>
  )
}
