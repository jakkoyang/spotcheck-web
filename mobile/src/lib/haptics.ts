import * as Haptics from 'expo-haptics'

// Haptics are a nicety: never let a missing Taptic Engine or disabled setting surface as an error.
const safely = (effect: () => Promise<void>) => () => {
  effect().catch(() => {})
}

// Sheet snapping between heights, chip toggles.
export const selectionFeedback = safely(() => Haptics.selectionAsync())
// Saving a spot.
export const lightImpactFeedback = safely(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light))
// A busy report went through.
export const successFeedback = safely(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success))
