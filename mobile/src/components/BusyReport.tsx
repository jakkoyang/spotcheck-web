import { useState } from 'react'
import { ActivityIndicator, Pressable, Text, View } from 'react-native'
import { Check } from 'lucide-react-native'
import { busyTierDescriptor, busyTierHex, type BusyTier } from '../lib/busyTier'
import { useThemeColors } from '../lib/theme'

// Each choice maps to a representative 0-10 score in its tier.
const CHOICES: { tier: BusyTier; label: string; score: number }[] = [
  { tier: 'low', label: busyTierDescriptor.low, score: 2 },
  { tier: 'moderate', label: busyTierDescriptor.moderate, score: 5 },
  { tier: 'high', label: busyTierDescriptor.high, score: 9 },
]

interface BusyReportProps {
  onSubmit: (busyScore: number) => Promise<void>
  // Live data requires an account; mock mode doesn't.
  needsSignIn: boolean
  onSignIn: () => void
}

export function BusyReport({ onSubmit, needsSignIn, onSignIn }: BusyReportProps) {
  const colors = useThemeColors()
  const [pendingScore, setPendingScore] = useState<number | null>(null)
  const [reported, setReported] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (reported) {
    return (
      <View className="flex-row items-center gap-2 rounded-xl bg-violet-50 px-3 py-3 dark:bg-violet-950/60">
        <Check size={16} color={colors.accent} />
        <Text className="text-footnote text-violet-700 dark:text-violet-300">Thanks! Your report updated this spot.</Text>
      </View>
    )
  }

  const submit = async (score: number) => {
    setError(null)
    setPendingScore(score)
    try {
      await onSubmit(score)
      setReported(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't send your report. Try again.")
    } finally {
      setPendingScore(null)
    }
  }

  return (
    <View className="gap-2">
      <Text className="text-body font-semibold text-neutral-900 dark:text-neutral-100">How busy is it right now?</Text>
      {needsSignIn ? (
        <Pressable
          onPress={onSignIn}
          className="items-center rounded-xl border border-neutral-300 py-3 active:bg-neutral-100 dark:border-neutral-700 dark:active:bg-neutral-800"
        >
          <Text className="text-body font-medium text-neutral-800 dark:text-neutral-200">Sign in to report</Text>
        </Pressable>
      ) : (
        <View className="flex-row gap-2">
          {CHOICES.map((choice) => (
            <Pressable
              key={choice.tier}
              onPress={() => submit(choice.score)}
              disabled={pendingScore !== null}
              accessibilityRole="button"
              accessibilityLabel={`Report: ${choice.label}`}
              className="flex-1 items-center gap-1.5 rounded-xl border border-neutral-200 py-3 active:bg-neutral-100 dark:border-neutral-700 dark:active:bg-neutral-800"
            >
              {pendingScore === choice.score ? (
                <ActivityIndicator size="small" color={busyTierHex[choice.tier]} />
              ) : (
                <View className="h-3 w-3 rounded-full" style={{ backgroundColor: busyTierHex[choice.tier] }} />
              )}
              <Text className="text-footnote font-medium text-neutral-700 dark:text-neutral-300">{choice.label}</Text>
            </Pressable>
          ))}
        </View>
      )}
      {error && <Text className="text-caption text-rose-600 dark:text-rose-400">{error}</Text>}
    </View>
  )
}
