import { useEffect, useMemo, useRef, useState } from 'react'
import { BackHandler, Keyboard, Pressable, Text, useWindowDimensions, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import Mapbox, { Camera, MapView } from '@rnmapbox/maps'
import BottomSheet, { BottomSheetFlatList, BottomSheetScrollView } from '@gorhom/bottom-sheet'
import { MapPin, Settings } from 'lucide-react-native'
import { FilterBar } from '../components/FilterBar'
import { LocationCard } from '../components/LocationCard'
import { LocationListItem } from '../components/LocationListItem'
import { SearchBar } from '../components/SearchBar'
import { SpotsLayer } from '../components/SpotsLayer'
import { getLocations, getVibeTags } from '../lib/data'
import {
  categoryFilters,
  filterSpots,
  sortByLeastBusy,
  type CategoryFilterId,
} from '../lib/spotFilters'
import { usePlaceSearch, type PlaceResult } from '../lib/usePlaceSearch'
import type { Location, VibeTag } from '../types/location'

const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN
if (MAPBOX_TOKEN) Mapbox.setAccessToken(MAPBOX_TOKEN)

const DEFAULT_CATEGORY: CategoryFilterId = 'study'
const PEEK_HEIGHT = 184
// Estimated height of the search bar + filter chips until the overlay reports its real layout.
const OVERLAY_HEIGHT_ESTIMATE = 100
// Space between the filter chips and the sheet when it's fully expanded.
const SHEET_TOP_GAP = 8
const SNAP = { peek: 0, half: 1, full: 2 } as const
const CAMPUS_CENTER: [number, number] = [-89.4, 43.0745]

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
  const cameraRef = useRef<Camera>(null)
  const sheetRef = useRef<BottomSheet>(null)
  const mapReadyRef = useRef(false)
  const [locations, setLocations] = useState<Location[]>([])
  const [vibeTags, setVibeTags] = useState<VibeTag[]>([])
  const [query, setQuery] = useState('')
  const [categoryId, setCategoryId] = useState<CategoryFilterId>(DEFAULT_CATEGORY)
  const [vibeSlugs, setVibeSlugs] = useState<string[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [sheetIndex, setSheetIndex] = useState<number>(SNAP.peek)
  // Bottom edge of the search/filter overlay; grows when the vibe filter row opens.
  const [overlayBottom, setOverlayBottom] = useState<number | null>(null)
  const [keyboardHeight, setKeyboardHeight] = useState(0)
  const placeResults = usePlaceSearch(query)

  const topInset = (overlayBottom ?? insets.top + OVERLAY_HEIGHT_ESTIMATE) + SHEET_TOP_GAP
  const peekHeight = PEEK_HEIGHT + insets.bottom
  const snapPoints = useMemo(() => [peekHeight, '50%', '100%'], [peekHeight])
  // Visible sheet height at each snap point (percentages are of the space below topInset).
  const sheetHeights = [peekHeight, (windowHeight - topInset) * 0.5, windowHeight - topInset]
  const viewport = { width: windowWidth, height: windowHeight }
  const paddingFor = (snapIndex: number): CameraPadding => ({
    top: topInset,
    bottom: sheetHeights[snapIndex] ?? peekHeight,
  })

  useEffect(() => {
    getLocations().then((data) => {
      setLocations(data)
      // If the map finished loading first, frame the default spots now; otherwise onDidFinishLoadingMap does it.
      if (mapReadyRef.current) {
        const initialSpots = filterSpots(data, { query: '', categoryId: DEFAULT_CATEGORY, vibeSlugs: [] })
        fitToSpots(cameraRef.current, initialSpots, viewport, { top: topInset, bottom: peekHeight }, 0)
      }
    })
    getVibeTags().then(setVibeTags)
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

  // Android back closes the detail view before it leaves the app.
  useEffect(() => {
    if (!selectedId) return
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      setSelectedId(null)
      return true
    })
    return () => subscription.remove()
  }, [selectedId])

  const results = sortByLeastBusy(filterSpots(locations, { query, categoryId, vibeSlugs }))
  const selectedLocation = locations.find((location) => location.id === selectedId) ?? null
  // The selected spot keeps its pin even if a filter change would hide it.
  const pinnedLocations =
    selectedLocation && !results.includes(selectedLocation) ? [...results, selectedLocation] : results
  const categoryLabel = categoryFilters.find((filter) => filter.id === categoryId)?.label ?? 'All'

  const selectLocation = (location: Location) => {
    Keyboard.dismiss()
    setSelectedId(location.id)
    sheetRef.current?.snapToIndex(SNAP.half)
    flyTo(cameraRef.current, location.lng, location.lat, paddingFor(SNAP.half))
  }

  const selectPlace = (place: PlaceResult) => {
    Keyboard.dismiss()
    setQuery('')
    setSelectedId(null)
    sheetRef.current?.snapToIndex(SNAP.peek)
    flyTo(cameraRef.current, place.lng, place.lat, paddingFor(SNAP.peek))
  }

  const changeCategory = (id: CategoryFilterId) => {
    setCategoryId(id)
    setSelectedId(null)
    fitToSpots(cameraRef.current, filterSpots(locations, { query, categoryId: id, vibeSlugs }), viewport, paddingFor(sheetIndex))
  }

  const toggleVibe = (slug: string) => {
    const next = vibeSlugs.includes(slug) ? vibeSlugs.filter((s) => s !== slug) : [...vibeSlugs, slug]
    setVibeSlugs(next)
    fitToSpots(cameraRef.current, filterSpots(locations, { query, categoryId, vibeSlugs: next }), viewport, paddingFor(sheetIndex))
  }

  const clearFilters = () => {
    setQuery('')
    setVibeSlugs([])
    setCategoryId('all')
  }

  const trimmedQuery = query.trim()
  const listTitle = trimmedQuery
    ? `${results.length} ${results.length === 1 ? 'spot matches' : 'spots match'} “${trimmedQuery}”`
    : categoryId === 'all'
      ? `${results.length} spots`
      : `${results.length} ${categoryLabel.toLowerCase()} spots`
  // Keeps the Mapbox logo and attribution just above the sheet. At full height the map is
  // covered anyway, so they stay at the half position instead of riding up over the filters.
  const ornamentBottom = Math.min(sheetHeights[sheetIndex] ?? peekHeight, sheetHeights[SNAP.half]) + 8

  return (
    <View className="flex-1 bg-neutral-900">
      {/* Dragging the map means the user wants to see it: tuck the sheet away. Driven by touch
          rather than onCameraChanged, whose gesture flag also fires when the keyboard resizes the map. */}
      <View
        style={{ flex: 1 }}
        onTouchMove={() => {
          if (sheetIndex === SNAP.peek) return
          Keyboard.dismiss()
          sheetRef.current?.snapToIndex(SNAP.peek)
        }}
      >
        <MapView
          style={{ flex: 1 }}
          styleURL="mapbox://styles/mapbox/dark-v11"
          scaleBarEnabled={false}
          rotateEnabled={false}
          pitchEnabled={false}
          logoPosition={{ bottom: ornamentBottom, left: 8 }}
          attributionPosition={{ bottom: ornamentBottom, right: 8 }}
          onDidFinishLoadingMap={() => {
            mapReadyRef.current = true
            fitToSpots(cameraRef.current, results, viewport, paddingFor(sheetIndex), 0)
          }}
        >
          <Camera ref={cameraRef} defaultSettings={{ centerCoordinate: CAMPUS_CENTER, zoomLevel: 14 }} />
          <SpotsLayer locations={pinnedLocations} selectedId={selectedId} onPressSpot={selectLocation} />
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
          <SearchBar
            value={query}
            onChangeText={setQuery}
            onFocus={() => setSelectedId(null)}
          />
          <Pressable
            onPress={() => router.push('/settings')}
            accessibilityLabel="Settings"
            className="items-center justify-center rounded-xl border border-neutral-700 bg-neutral-900/95 px-3"
          >
            <Settings size={18} color="#a3a3a3" />
          </Pressable>
        </View>
        <FilterBar
          categoryId={categoryId}
          onCategoryChange={changeCategory}
          vibeTags={vibeTags}
          selectedVibeSlugs={vibeSlugs}
          onToggleVibe={toggleVibe}
        />
      </View>

      <BottomSheet
        ref={sheetRef}
        index={SNAP.peek}
        snapPoints={snapPoints}
        topInset={topInset}
        enableDynamicSizing={false}
        // "adjustResize" makes the sheet leave the keyboard alone; the keyboard listener above handles it.
        android_keyboardInputMode="adjustResize"
        onChange={(index) => setSheetIndex(index)}
        backgroundStyle={{ backgroundColor: '#171717', borderColor: '#404040', borderWidth: 1 }}
        handleIndicatorStyle={{ backgroundColor: '#525252', width: 40 }}
      >
        {selectedLocation ? (
          <BottomSheetScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}>
            <LocationCard
              location={selectedLocation}
              vibeTags={vibeTags}
              onClose={() => setSelectedId(null)}
            />
          </BottomSheetScrollView>
        ) : (
          <BottomSheetFlatList
            data={results}
            keyExtractor={(location: Location) => location.id}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: insets.bottom + 16 + keyboardHeight }}
            ListHeaderComponent={
              <View className="px-4 pb-2">
                <Text className="text-sm font-semibold text-neutral-50">{listTitle}</Text>
                <Text className="text-xs text-neutral-500">
                  {trimmedQuery ? 'Searching all categories' : 'Least busy first'}
                </Text>
              </View>
            }
            renderItem={({ item }: { item: Location }) => (
              <View className="px-4 pb-2">
                <LocationListItem location={item} onPress={() => selectLocation(item)} />
              </View>
            )}
            ListEmptyComponent={
              placeResults.length === 0 ? (
                <View className="items-center py-4">
                  <Text className="text-sm text-neutral-400">No spots match these filters.</Text>
                  <Pressable onPress={clearFilters} className="mt-2">
                    <Text className="text-sm font-medium text-emerald-400">Clear filters</Text>
                  </Pressable>
                </View>
              ) : null
            }
            ListFooterComponent={
              placeResults.length > 0 ? (
                <View className="gap-2 px-4 pt-2">
                  <Text className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    Addresses
                  </Text>
                  {placeResults.map((place) => (
                    <Pressable
                      key={`${place.lat},${place.lng}`}
                      onPress={() => selectPlace(place)}
                      className="flex-row items-center gap-3 rounded-xl border border-neutral-800 px-4 py-3"
                    >
                      <MapPin size={16} color="#737373" />
                      <Text className="flex-1 text-sm text-neutral-300" numberOfLines={1}>
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
    </View>
  )
}
