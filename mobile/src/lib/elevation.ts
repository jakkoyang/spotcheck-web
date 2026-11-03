import { Platform, type ViewStyle } from 'react-native'

// iOS uses boxShadow (rendered efficiently as layer shadows). Android uses native `elevation`:
// boxShadow there redraws a blurred shadow every frame, which kept the GPU at ~16 ms a frame on
// its own; elevation shadows are hardware-rendered and cached. Elevation needs the view to
// have a background, which every surface using these does.
const shadow = (ios: string, androidElevation: number): ViewStyle =>
  Platform.OS === 'android' ? { elevation: androidElevation } : { boxShadow: ios }

// Floating controls over the map (search bar, round buttons, pills).
export const floatingShadow = shadow('0px 2px 10px rgba(0, 0, 0, 0.16)', 4)

// Filter chips: lighter, since a whole row of them sits over the map.
export const chipShadow = shadow('0px 1px 4px rgba(0, 0, 0, 0.14)', 2)

// The bottom sheet, casting upward onto the map. On iOS it goes on the sheet's container; on
// Android elevation has to sit on the view that draws the background (gorhom's backgroundStyle).
export const sheetShadow: ViewStyle = Platform.OS === 'android' ? {} : { boxShadow: '0px -4px 20px rgba(0, 0, 0, 0.12)' }
export const sheetBackgroundShadow: ViewStyle = Platform.OS === 'android' ? { elevation: 12 } : {}
