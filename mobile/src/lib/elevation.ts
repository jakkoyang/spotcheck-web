import type { ViewStyle } from 'react-native'

// boxShadow renders on both iOS and Android under the New Architecture; `elevation` was Android-only.
// Floating controls over the map (search bar, round buttons, pills).
export const floatingShadow: ViewStyle = { boxShadow: '0px 2px 10px rgba(0, 0, 0, 0.16)' }

// Filter chips: lighter, since a whole row of them sits over the map.
export const chipShadow: ViewStyle = { boxShadow: '0px 1px 4px rgba(0, 0, 0, 0.14)' }

// The bottom sheet, casting upward onto the map.
export const sheetShadow: ViewStyle = { boxShadow: '0px -4px 20px rgba(0, 0, 0, 0.12)' }
