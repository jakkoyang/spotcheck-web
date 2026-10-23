import { useEffect, useState } from 'react'
import { Animated, View } from 'react-native'

// Placeholder rows shown while spots load, pulsing so the wait reads as progress.
export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  const [opacity] = useState(() => new Animated.Value(0.5))

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ]),
    )
    loop.start()
    return () => loop.stop()
  }, [opacity])

  return (
    <Animated.View style={{ opacity }} className="px-4" accessibilityLabel="Loading spots">
      {Array.from({ length: rows }, (_, i) => (
        <View
          key={i}
          className="flex-row items-center gap-3 py-3"
        >
          <View className="h-11 w-11 rounded-full bg-neutral-200 dark:bg-neutral-800" />
          <View className="flex-1 gap-2">
            <View className="h-3 w-3/5 rounded bg-neutral-200 dark:bg-neutral-800" />
            <View className="h-2.5 w-2/5 rounded bg-neutral-200 dark:bg-neutral-800" />
          </View>
          <View className="h-6 w-24 rounded-full bg-neutral-200 dark:bg-neutral-800" />
        </View>
      ))}
    </Animated.View>
  )
}
