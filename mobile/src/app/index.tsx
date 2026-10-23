import { useEffect, useMemo, useRef, useState } from 'react'
import { BackHandler, Keyboard, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import Mapbox, { Camera, LocationPuck, MapView } from '@rnmapbox/maps'
import BottomSheet, { BottomSheetFlatList, BottomSheetScrollView } from '@gorhom/bottom-sheet'
import { useAnimatedReaction, useSharedValue } from 'react-native-reanimated'
import { scheduleOnRN } from 'react-native-worklets'
import { ArrowUpDown, List, LocateFixed, MapPin, Settings } from 'lucide-react-native'
import { FilterBar } from '../components/FilterBar'
import { ListSkeleton } from '../components/ListSkeleton'
import { LocationCard } from '../components/LocationCard'
import { LocationListItem } from '../components/LocationListItem'
import { SearchBar } from '../components/SearchBar'
import { SpotsLayer } from '../components/SpotsLayer'
import { useSession } from '../lib/auth'
import { floatingShadow, sheetShadow } from '../lib/elevation'
import {
  busyReportsRequireSignIn,
  getLocations,
  getSavedSpotIds,
  getVibeTags,
  setSpotSaved,
  submitBusyReport,
} from '../lib/data'
import { openWalkingDirections } from '../lib/directions'
import { sortByDistance, walkLabel, type Coords } from '../lib/distance'
import { lightImpactFeedback, selectionFeedback, successFeedback } from '../lib/haptics'
import {
  categoryFilters,
  filterSpots,
  sortByLeastBusy,
  type CategoryFilterId,
} from '../lib/spotFilters'
import { useThemeColors } from '../lib/theme'
import { usePlaceSearch, type PlaceResult } from '../lib/usePlaceSearch'
import { useUserLocation } from '../lib/useUserLocation'
import type { Location, VibeTag } from '../types/location'

const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN
if (MAPBOX_TOKEN) Mapbox.setAccessToken(MAPBOX_TOKEN)

const DEFAULT_CATEGORY: CategoryFilterId = 'all'
// The list opens to this share of the screen; a spot's card sizes the sheet to fit instead.
const LIST_HEIGHT_RATIO = 0.5
// Estimated height of the search bar + filter chips until the overlay reports its real layout.
const OVERLAY_HEIGHT_ESTIMATE = 100
// Space between the filter chips and the sheet when it's fully expanded.
const SHEET_TOP_GAP = 8
// The list opens at half and drags up to full; a spot's card has just its own height (index 0).
// closed (-1) is gorhom's index once the sheet is swiped away.
const SNAP = { closed: -1, half: 0, full: 1 } as const
// Space the floating "Show list" pill takes when the sheet is closed.
const SHOW_LIST_CLEARANCE = 64
// gorhom's default handle area above the sheet content.
const SHEET_HANDLE_HEIGHT = 24
// The floating locate button (h-14), and the map it needs left between itself and the chips.
const LOCATE_BUTTON_SIZE = 56
const LOCATE_TOP_CLEARANCE = 48
// First guess at the spot card's height, before it has been measured once.
const DETAIL_HEIGHT_ESTIMATE = 400
const CAMPUS_CENTER: [number, number] = [-89.4, 43.0745]

type SortMode = 'busy' | 'nearest'

interface CameraPadding {
  top: number
  bottom: number
}

function flyTo(camera: Camera | null, lng: number, lat: number, padding: CameraPadding) {
  camera?.setCamera({
    centerCoordinate: [lng, lat],
    zoomLevel: 16,
    padding: { paddingTop: padding.top, paddingBottom: padding.bottom, paddingLeft: 0, paddingRight: 0 },
    animationDuration: 600,
  })
}

// Web Mercator in 0..1 world units; Mapbox's world is TILE_SIZE * 2^zoom points wide.
const TILE_SIZE = 512
const MAX_FIT_ZOOM = 16
const FIT_SIDE_PADDING = 40
const mercatorX = (lng: number) => (lng + 180) / 360
const mercatorY = (lat: number) => {
  const sin = Math.sin((lat * Math.PI) / 180)
  return 0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)
}
const latFromMercatorY = (y: number) =>
  (360 / Math.PI) * Math.atan(Math.exp((0.5 - y) * 2 * Math.PI)) - 90

// Frames every given spot in the part of the map the sheet and search bar leave visible.
// Computes center/zoom itself rather than using Camera.fitBounds, which on Android
// over-zooms once an earlier setCamera call has left viewport padding on the map.
function fitToSpots(
  camera: Camera | null,
  spots: Location[],
  viewport: { width: number; height: number },
  padding: CameraPadding,
  duration = 600,
) {
  if (!camera || spots.length === 0) return
  const xs = spots.map((spot) => mercatorX(spot.lng))
  const ys = spots.map((spot) => mercatorY(spot.lat))
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]
  const top = padding.top + 16
  const bottom = padding.bottom + 24
  const availableWidth = Math.max(1, viewport.width - 2 * FIT_SIDE_PADDING)
  const availableHeight = Math.max(1, viewport.height - top - bottom)
  const zoomForX = maxX > minX ? Math.log2(availableWidth / (TILE_SIZE * (maxX - minX))) : MAX_FIT_ZOOM
  const zoomForY = maxY > minY ? Math.log2(availableHeight / (TILE_SIZE * (maxY - minY))) : MAX_FIT_ZOOM

  camera.setCamera({
    centerCoordinate: [((minX + maxX) / 2) * 360 - 180, latFromMercatorY((minY + maxY) / 2)],
    zoomLevel: Math.min(MAX_FIT_ZOOM, zoomForX, zoomForY),
    padding: {
      paddingTop: top,
      paddingBottom: bottom,
      paddingLeft: FIT_SIDE_PADDING,
      paddingRight: FIT_SIDE_PADDING,
    },
    animationDuration: duration,
  })
}

export default function ExploreScreen() {
  const insets = useSafeAreaInsets()
  const { width: windowWidth, height: windowHeight } = useWindowDimensions()
  const colors = useThemeColors()
  const { session } = useSession()
  const userLocation = useUserLocation()
  const cameraRef = useRef<Camera>(null)
  const sheetRef = useRef<BottomSheet>(null)
  const mapReadyRef = useRef(false)
  // Whether closing a spot's card returns to the list (opened from it) or the bare map (opened from a pin).
  const returnToListRef = useRef(false)
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [vibeTags, setVibeTags] = useState<VibeTag[]>([])
  const [savedIds, setSavedIds] = useState<ReadonlySet<string>>(new Set())
  const [query, setQuery] = useState('')
  const [categoryId, setCategoryId] = useState<CategoryFilterId>(DEFAULT_CATEGORY)
  const [vibeSlugs, setVibeSlugs] = useState<string[]>([])
  const [openNow, setOpenNow] = useState(false)
  const [savedOnly, setSavedOnly] = useState(false)
  const [sortMode, setSortMode] = useState<SortMode>('busy')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  // The map starts unobstructed; the list opens from the "Show list" pill.
  const [sheetIndex, setSheetIndex] = useState<number>(SNAP.closed)
  // onChange can skip a snap (a drag that overshoots the top settles on full without firing it),
  // so the index also follows the sheet's own animated index.
  const animatedSheetIndex = useSharedValue<number>(SNAP.closed)
  useAnimatedReaction(
    () => Math.round(animatedSheetIndex.value),
    (index, previous) => {
      if (index !== previous) scheduleOnRN(setSheetIndex, index)
    },
  )
  // Bottom edge of the search/filter overlay.
  const [overlayBottom, setOverlayBottom] = useState<number | null>(null)
  const [keyboardHeight, setKeyboardHeight] = useState(0)
  const [detailHeight, setDetailHeight] = useState(DETAIL_HEIGHT_ESTIMATE)
  const placeResults = usePlaceSearch(query)

  const selectedLocation = locations.find((location) => location.id === selectedId) ?? null
  const overlayEdge = overlayBottom ?? insets.top + OVERLAY_HEIGHT_ESTIMATE
  const topInset = overlayEdge + SHEET_TOP_GAP
  const fullHeight = windowHeight - topInset
  // A spot's card sizes the sheet to exactly its own height, so there's no band of empty space under it.
  const detailSheetHeight = Math.min(detailHeight + SHEET_HANDLE_HEIGHT + insets.bottom + 12, fullHeight)
  const halfHeight = windowHeight * LIST_HEIGHT_RATIO
  const sheetHeights = useMemo(
    () => (selectedLocation ? [detailSheetHeight] : [halfHeight, fullHeight]),
    [selectedLocation, detailSheetHeight, halfHeight, fullHeight],
  )
  const closedClearance = insets.bottom + SHOW_LIST_CLEARANCE
  // Map area the sheet (or, when closed, the "Show list" pill) covers at a given snap index.
  const coveredHeight = (snapIndex: number, height?: number) =>
    snapIndex === SNAP.closed ? closedClearance : (height ?? sheetHeights[snapIndex] ?? sheetHeights[0])
  const viewport = { width: windowWidth, height: windowHeight }
  const paddingFor = (snapIndex: number, height?: number): CameraPadding => ({
    top: topInset,
    bottom: coveredHeight(snapIndex, height),
  })

  useEffect(() => {
    getLocations().then((data) => {
      setLocations(data)
      setLoading(false)
      // If the map finished loading first, frame the default spots now; otherwise onDidFinishLoadingMap does it.
      if (mapReadyRef.current) {
        const initialSpots = filterSpots(data, { query: '', categoryId: DEFAULT_CATEGORY, vibeSlugs: [] })
        fitToSpots(cameraRef.current, initialSpots, viewport, { top: topInset, bottom: closedClearance }, 0)
      }
    })
    getVibeTags().then(setVibeTags)
    getSavedSpotIds().then((ids) => setSavedIds(new Set(ids)))
    // Runs once on mount; the insets used for the initial framing don't change after launch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // With edge-to-edge the window doesn't resize for the keyboard, so the keyboard draws over the
  // sheet. Expand the sheet while it's open (results stay visible above it) and pad the list so
  // the last rows can scroll clear of it.
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', (event) => {
      setKeyboardHeight(event.endCoordinates.height)
      sheetRef.current?.snapToIndex(SNAP.full)
    })
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardHeight(0))
    return () => {
      show.remove()
      hide.remove()
    }
  }, [])

  const filterOptions = (overrides: Partial<Parameters<typeof filterSpots>[1]> = {}) => ({
    query,
    categoryId,
    vibeSlugs,
    openNow,
    onlyIds: savedOnly ? savedIds : null,
    ...overrides,
  })
  const filtered = filterSpots(locations, filterOptions())
  const results =
    sortMode === 'nearest' && userLocation.coords
      ? sortByDistance(filtered, userLocation.coords)
      : sortByLeastBusy(filtered)
  // The selected spot keeps its pin even if a filter change would hide it.
  const pinnedLocations =
    selectedLocation && !results.includes(selectedLocation) ? [...results, selectedLocation] : results
  const categoryLabel = categoryFilters.find((filter) => filter.id === categoryId)?.label ?? 'All'
  const walkTo = (location: Location) => walkLabel(userLocation.coords, location)

  const refit = (overrides: Partial<Parameters<typeof filterSpots>[1]>) =>
    fitToSpots(cameraRef.current, filterSpots(locations, filterOptions(overrides)), viewport, paddingFor(sheetIndex))

  const selectLocation = (location: Location) => {
    Keyboard.dismiss()
    if (!selectedId) returnToListRef.current = sheetIndex !== SNAP.closed
    setSelectedId(location.id)
    sheetRef.current?.snapToIndex(SNAP.half)
    flyTo(cameraRef.current, location.lng, location.lat, paddingFor(SNAP.half, detailSheetHeight))
  }

  const closeDetail = () => {
    setSelectedId(null)
    if (!returnToListRef.current) sheetRef.current?.close()
  }

  // Android back closes the spot's card, then the list, before it leaves the app.
  useEffect(() => {
    if (!selectedId && sheetIndex === SNAP.closed) return
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (selectedId) closeDetail()
      else sheetRef.current?.close()
      return true
    })
    return () => subscription.remove()
  })

  const selectPlace = (place: PlaceResult) => {
    Keyboard.dismiss()
    setQuery('')
    setSelectedId(null)
    sheetRef.current?.close()
    flyTo(cameraRef.current, place.lng, place.lat, paddingFor(SNAP.closed))
  }

  const changeCategory = (id: CategoryFilterId) => {
    selectionFeedback()
    setCategoryId(id)
    setSelectedId(null)
    refit({ categoryId: id })
  }

  const toggleVibe = (slug: string) => {
    selectionFeedback()
    const next = vibeSlugs.includes(slug) ? vibeSlugs.filter((s) => s !== slug) : [...vibeSlugs, slug]
    setVibeSlugs(next)
    refit({ vibeSlugs: next })
  }

  const clearVibes = () => {
    selectionFeedback()
    setVibeSlugs([])
    refit({ vibeSlugs: [] })
  }

  const toggleOpenNow = () => {
    selectionFeedback()
    setOpenNow(!openNow)
    refit({ openNow: !openNow })
  }

  const toggleSavedOnly = () => {
    selectionFeedback()
    setSavedOnly(!savedOnly)
    refit({ onlyIds: !savedOnly ? savedIds : null })
  }

  const clearFilters = () => {
    setQuery('')
    setVibeSlugs([])
    setOpenNow(false)
    setSavedOnly(false)
    setCategoryId('all')
  }

  const toggleSort = async () => {
    selectionFeedback()
    if (sortMode === 'nearest') {
      setSortMode('busy')
      return
    }
    // Nearest needs a position; asking here ties the permission prompt to a clear reason.
    const coords = userLocation.coords ?? (await userLocation.request())
    if (coords) setSortMode('nearest')
  }

  const centerOnUser = async () => {
    const coords: Coords | null = userLocation.coords ?? (await userLocation.request())
    if (coords) flyTo(cameraRef.current, coords.lng, coords.lat, paddingFor(sheetIndex))
  }

  const toggleSaved = async (location: Location) => {
    lightImpactFeedback()
    const next = await setSpotSaved(location.id, !savedIds.has(location.id))
    setSavedIds(new Set(next))
  }

  const reportBusy = async (location: Location, busyScore: number) => {
    const updated = await submitBusyReport(location.id, busyScore)
    setLocations((current) => current.map((l) => (l.id === updated.id ? updated : l)))
    successFeedback()
  }

  const trimmedQuery = query.trim()
  const listTitle = trimmedQuery
    ? `${results.length} ${results.length === 1 ? 'spot matches' : 'spots match'} “${trimmedQuery}”`
    : savedOnly
      ? `${results.length} saved ${results.length === 1 ? 'spot' : 'spots'}`
      : categoryId === 'all'
        ? `${results.length} spots`
        : `${results.length} ${categoryLabel.toLowerCase()} spots`
  const nearestActive = sortMode === 'nearest' && userLocation.coords !== null
  // Ornaments live just under the filter chips: always visible, never colliding with the
  // sheet or the "Show list" pill.
  const ornamentTop = overlayEdge + 6
  // Google Maps-style locate button: bottom right, level with the "Show list" pill when the sheet
  // is closed, otherwise riding just above the sheet. Hidden once the sheet is tall enough that
  // the button would reach the filter chips (the full list, a long spot card, the keyboard).
  const locateBottom = sheetIndex === SNAP.closed ? insets.bottom + 12 : coveredHeight(sheetIndex) + 12
  const showLocateButton =
    keyboardHeight === 0 && locateBottom + LOCATE_BUTTON_SIZE + LOCATE_TOP_CLEARANCE < windowHeight - overlayEdge

  return (
    <View className="flex-1 bg-white dark:bg-neutral-900">
      {/* Dragging the map means the user wants to see it: tuck the sheet away. Driven by touch
          rather than onCameraChanged, whose gesture flag also fires when the keyboard resizes the map. */}
      <View
        style={{ flex: 1 }}
        onTouchMove={(event) => {
          // Only the list tucks away; a spot's card stays up while the user looks around it.
          if (sheetIndex === SNAP.closed || selectedId) return
          // Touches on the sheet itself also arrive here on Android; only drags on the visible map count.
          if (event.nativeEvent.pageY > windowHeight - coveredHeight(sheetIndex)) return
          Keyboard.dismiss()
          sheetRef.current?.close()
        }}
      >
        <MapView
          style={{ flex: 1 }}
          styleURL={colors.mapStyle}
          scaleBarEnabled={false}
          rotateEnabled={false}
          pitchEnabled={false}
          compassEnabled={false}
          logoPosition={{ top: ornamentTop, left: 12 }}
          attributionPosition={{ top: ornamentTop, right: 12 }}
          onDidFinishLoadingMap={() => {
            mapReadyRef.current = true
            fitToSpots(cameraRef.current, results, viewport, paddingFor(sheetIndex), 0)
          }}
        >
          <Camera ref={cameraRef} defaultSettings={{ centerCoordinate: CAMPUS_CENTER, zoomLevel: 14 }} />
          {userLocation.permission === 'granted' && <LocationPuck pulsing={{ isEnabled: true }} />}
          <SpotsLayer
            locations={pinnedLocations}
            selectedId={selectedId}
            colors={colors}
            onPressSpot={selectLocation}
            onPressCluster={(coordinates, zoom) =>
              cameraRef.current?.setCamera({ centerCoordinate: coordinates, zoomLevel: zoom + 0.5, animationDuration: 500 })
            }
          />
        </MapView>
      </View>

      {/* Sits flush under the status bar, like Google Maps' search bar. */}
      <View
        className="absolute inset-x-0 top-0 gap-2 px-3"
        style={{ paddingTop: insets.top }}
        onLayout={(event) => {
          const { y, height } = event.nativeEvent.layout
          setOverlayBottom(y + height)
        }}
      >
        <View className="flex-row gap-2">
          <SearchBar value={query} onChangeText={setQuery} onFocus={() => setSelectedId(null)} />
          <Pressable
            onPress={() => router.push('/settings')}
            accessibilityLabel="Settings"
            className="h-12 w-12 items-center justify-center rounded-full border border-transparent bg-white active:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900 dark:active:bg-neutral-800"
            style={floatingShadow}
          >
            <Settings size={20} color={colors.textSecondary} />
          </Pressable>
        </View>
        <FilterBar
          categoryId={categoryId}
          onCategoryChange={changeCategory}
          openNow={openNow}
          onToggleOpenNow={toggleOpenNow}
          savedOnly={savedOnly}
          onToggleSavedOnly={toggleSavedOnly}
          vibeTags={vibeTags}
          selectedVibeSlugs={vibeSlugs}
          onToggleVibe={toggleVibe}
          onClearVibes={clearVibes}
        />
      </View>

      {showLocateButton && (
        <Pressable
          onPress={centerOnUser}
          accessibilityLabel="Center map on my location"
          className="absolute right-4 h-14 w-14 items-center justify-center rounded-full border border-transparent bg-white active:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900 dark:active:bg-neutral-800"
          style={[floatingShadow, { bottom: locateBottom }]}
        >
          <LocateFixed size={24} color={userLocation.coords ? colors.accent : colors.textSecondary} />
        </Pressable>
      )}

      <BottomSheet
        ref={sheetRef}
        index={SNAP.closed}
        snapPoints={sheetHeights}
        animatedIndex={animatedSheetIndex}
        // Dragging past the top snap leaves the sheet unresponsive to touches on Android.
        enableOverDrag={false}
        topInset={topInset}
        enableDynamicSizing={false}
        // "adjustResize" makes the sheet leave the keyboard alone; the keyboard listener above handles it.
        android_keyboardInputMode="adjustResize"
        enablePanDownToClose
        onChange={(index) => {
          if (index >= 0) selectionFeedback()
          setSheetIndex(index)
          // Swiping the sheet away also dismisses the spot it was showing.
          if (index === SNAP.closed) {
            Keyboard.dismiss()
            setSelectedId(null)
          }
        }}
        style={sheetShadow}
        backgroundStyle={{
          backgroundColor: colors.background,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          // A shadow barely shows on the dark map, so dark mode keeps a hairline edge instead.
          ...(colors.isDark && { borderColor: colors.border, borderWidth: StyleSheet.hairlineWidth }),
        }}
        handleIndicatorStyle={{ backgroundColor: colors.handle, width: 40 }}
      >
        {selectedLocation ? (
          <BottomSheetScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 8 }}>
            <LocationCard
              location={selectedLocation}
              vibeTags={vibeTags}
              walkLabel={walkTo(selectedLocation)}
              saved={savedIds.has(selectedLocation.id)}
              reportNeedsSignIn={busyReportsRequireSignIn() && !session}
              onClose={closeDetail}
              onToggleSaved={() => toggleSaved(selectedLocation)}
              onDirections={() => openWalkingDirections(selectedLocation)}
              onReport={(score) => reportBusy(selectedLocation, score)}
              onSignIn={() => router.push('/settings')}
              onLayout={(event) => setDetailHeight(event.nativeEvent.layout.height)}
            />
          </BottomSheetScrollView>
        ) : (
          <BottomSheetFlatList
            data={results}
            keyExtractor={(location: Location) => location.id}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: insets.bottom + 16 + keyboardHeight }}
            ListHeaderComponent={
              <View className="flex-row items-center justify-between gap-3 px-4 pb-1 pt-1">
                <View className="flex-1">
                  <Text className="text-headline font-bold text-neutral-900 dark:text-neutral-50">
                    {loading ? 'Loading spots…' : listTitle}
                  </Text>
                  {trimmedQuery ? (
                    <Text className="text-footnote text-neutral-500">Searching all categories</Text>
                  ) : null}
                </View>
                <Pressable
                  onPress={toggleSort}
                  accessibilityRole="button"
                  accessibilityLabel={`Sort by ${nearestActive ? 'least busy' : 'nearest'}`}
                  className="flex-row items-center gap-1.5 rounded-full bg-neutral-100 px-3 py-2 active:bg-neutral-200 dark:bg-neutral-800 dark:active:bg-neutral-700"
                >
                  <ArrowUpDown size={14} color={colors.textSecondary} />
                  <Text className="text-footnote font-medium text-neutral-700 dark:text-neutral-300">
                    {nearestActive ? 'Nearest' : 'Least busy'}
                  </Text>
                </Pressable>
              </View>
            }
            renderItem={({ item }: { item: Location }) => (
              <LocationListItem location={item} walkLabel={walkTo(item)} onPress={() => selectLocation(item)} />
            )}
            // Inset to line up with the row text, past the icon.
            ItemSeparatorComponent={() => <View className="ml-[72px] h-px bg-neutral-200 dark:bg-neutral-800" />}
            ListEmptyComponent={
              loading ? (
                <ListSkeleton />
              ) : placeResults.length === 0 ? (
                <View className="items-center px-6 py-4">
                  <Text className="text-center text-body text-neutral-500 dark:text-neutral-400">
                    {savedOnly && savedIds.size === 0
                      ? 'No saved spots yet. Open a spot and tap Save to keep it here.'
                      : 'No spots match these filters.'}
                  </Text>
                  <Pressable onPress={clearFilters} className="mt-2">
                    <Text className="text-body font-semibold text-violet-600 dark:text-violet-400">Clear filters</Text>
                  </Pressable>
                </View>
              ) : null
            }
            ListFooterComponent={
              placeResults.length > 0 ? (
                <View className="gap-2 px-4 pt-2">
                  <Text className="text-caption font-semibold uppercase tracking-wide text-neutral-500">Addresses</Text>
                  {placeResults.map((place) => (
                    <Pressable
                      key={`${place.lat},${place.lng}`}
                      onPress={() => selectPlace(place)}
                      className="flex-row items-center gap-3 rounded-xl bg-neutral-100 px-4 py-3 active:bg-neutral-200 dark:bg-neutral-800 dark:active:bg-neutral-700"
                    >
                      <MapPin size={18} color={colors.textSecondary} />
                      <Text className="flex-1 text-body text-neutral-700 dark:text-neutral-300" numberOfLines={1}>
                        {place.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : null
            }
          />
        )}
      </BottomSheet>

      {sheetIndex === SNAP.closed && (
        <Pressable
          onPress={() => {
            // Hide the pill now rather than when the sheet reports in, which can lag while the list mounts.
            setSheetIndex(SNAP.half)
            sheetRef.current?.snapToIndex(SNAP.half)
          }}
          accessibilityLabel={`Show list of ${results.length} spots`}
          className="absolute flex-row items-center gap-2 self-center rounded-full border border-transparent bg-white px-5 py-3 active:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900 dark:active:bg-neutral-800"
          style={[floatingShadow, { bottom: insets.bottom + 12 }]}
        >
          <List size={18} color={colors.textSecondary} />
          <Text className="text-body font-semibold text-neutral-800 dark:text-neutral-100">Show list · {results.length}</Text>
        </Pressable>
      )}
    </View>
  )
}
