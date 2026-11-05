import { memo, useCallback, useMemo, useRef, type ComponentProps } from 'react'
import { View } from 'react-native'
import { CircleLayer, Image, Images, ShapeSource, SymbolLayer } from '@rnmapbox/maps'
import { busyTierHex, getBusyTier, STALE_HEX } from '../lib/busyTier'
import { CATEGORY_META } from '../lib/categories'
import { getFreshnessLevel } from '../lib/freshness'
import type { ThemeColors } from '../lib/theme'
import type { Location } from '../types/location'

const CLUSTER_RADIUS = 44
// Past this zoom every spot shows individually.
const CLUSTER_MAX_ZOOM = 15
const IS_CLUSTER = ['has', 'point_count'] as const
const NOT_CLUSTER = ['!', ['has', 'point_count']] as const
const ICON_IMAGE = ['concat', 'icon-', ['get', 'iconKey']] as const
const TEXT_FONT = ['DIN Pro Medium', 'Arial Unicode MS Regular']
// Spot names appear once the map is zoomed in far enough that they don't crowd each other.
const LABEL_MIN_ZOOM = 15.5
// White ring in both themes: it separates a pin from the map whether the map is light or dark.
const PIN_RING = '#ffffff'
const HITBOX = { width: 28, height: 28 }

type ShapePressEvent = Parameters<NonNullable<ComponentProps<typeof ShapeSource>['onPress']>>[0]

// Layer styles are module constants (or memoized on the theme): every new style object is
// re-applied to the native map layer, so they must not be rebuilt on each render.
const PIN_CIRCLE = {
  circleRadius: 14,
  circleColor: ['get', 'color'],
  circleStrokeColor: PIN_RING,
  circleStrokeWidth: 2.5,
} as const
// A blurred circle offset below the pin, standing in for a drop shadow.
const PIN_SHADOW = {
  circleRadius: 17,
  circleColor: '#000000',
  circleOpacity: 0.22,
  circleBlur: 0.7,
  circleTranslate: [0, 2] as [number, number],
} as const
const PIN_ICON = {
  iconImage: ICON_IMAGE,
  iconSize: 0.85,
  iconAllowOverlap: true,
  iconIgnorePlacement: true,
} as const
const SELECTED_SHADOW = { ...PIN_SHADOW, circleRadius: 23 }
const SELECTED_ICON = { ...PIN_ICON, iconSize: 1.1 }

function toFeature(location: Location): GeoJSON.Feature<GeoJSON.Point> {
  const freshness = getFreshnessLevel(location.lastUpdated)
  return {
    type: 'Feature',
    id: location.id,
    properties: {
      id: location.id,
      name: location.name,
      iconKey: CATEGORY_META[location.category] ? location.category : 'study',
      // Reports too old to trust go grey.
      color: freshness === 'stale' ? STALE_HEX : busyTierHex[getBusyTier(location.busyScore)],
    },
    geometry: { type: 'Point', coordinates: [location.lng, location.lat] },
  }
}

// The category icons drawn inside pins. Rendered once per map style: each re-render re-rasterizes
// them natively.
const PinImages = memo(function PinImages() {
  return (
    <Images>
      {Object.entries(CATEGORY_META).map(([key, { Icon }]) => (
        <Image key={key} name={`icon-${key}`}>
          <View style={{ width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }}>
            <Icon size={18} color="#ffffff" strokeWidth={2.4} />
          </View>
        </Image>
      ))}
    </Images>
  )
})

interface SpotsLayerProps {
  locations: Location[]
  selectedId: string | null
  colors: ThemeColors
  // The style that has finished loading. A new style drops the map's images, and Android can't
  // re-add images drawn from views (it discards their bitmaps), so PinImages remounts to redraw them.
  loadedMapStyle: string
  onPressSpot: (location: Location) => void
  onPressCluster: (coordinates: [number, number], expansionZoom: number) => void
}

// Memoized: the Explore screen re-renders on every sheet move and location update, and each new
// shape sent here makes Mapbox re-cluster all the pins. With stable props it only updates when
// the spots, the selection or the theme actually change.
export const SpotsLayer = memo(function SpotsLayer({
  locations,
  selectedId,
  colors,
  loadedMapStyle,
  onPressSpot,
  onPressCluster,
}: SpotsLayerProps) {
  const sourceRef = useRef<ShapeSource>(null)

  const { spots, selected } = useMemo(() => {
    const others = locations.filter((l) => l.id !== selectedId).map(toFeature)
    const picked = locations.find((l) => l.id === selectedId)
    return {
      spots: { type: 'FeatureCollection', features: others } as GeoJSON.FeatureCollection<GeoJSON.Point>,
      selected: {
        type: 'FeatureCollection',
        features: picked ? [toFeature(picked)] : [],
      } as GeoJSON.FeatureCollection<GeoJSON.Point>,
    }
  }, [locations, selectedId])

  const themed = useMemo(() => {
    const pinLabel = {
      textField: ['get', 'name'],
      textFont: TEXT_FONT,
      textSize: 12,
      textColor: colors.text,
      textHaloColor: colors.background,
      textHaloWidth: 1.5,
      textAnchor: 'top',
      textOffset: [0, 1.6] as number[],
      textMaxWidth: 9,
      // Labels drop out where they would collide; pins never do.
      textOptional: true,
    } as const
    return {
      pinLabel,
      // Neutral rather than a busy color, so a cluster never reads as one tier.
      clusterCircle: {
        circleColor: colors.text,
        circleStrokeColor: PIN_RING,
        circleStrokeWidth: 2.5,
        circleRadius: ['step', ['get', 'point_count'], 17, 10, 21, 25, 25],
      } as const,
      clusterCount: {
        textField: ['get', 'point_count_abbreviated'],
        textFont: TEXT_FONT,
        textSize: 14,
        textColor: colors.background,
        textAllowOverlap: true,
        textIgnorePlacement: true,
      } as const,
      selectedCircle: { ...PIN_CIRCLE, circleRadius: 19, circleStrokeColor: colors.text, circleStrokeWidth: 3 },
      selectedLabel: { ...pinLabel, textSize: 13, textOffset: [0, 2], textOptional: false, textAllowOverlap: true },
    }
  }, [colors])

  const handlePress = useCallback(
    async (event: ShapePressEvent) => {
      const feature = event.features[0]
      if (!feature) return
      if (feature.properties?.cluster) {
        const zoom = await sourceRef.current?.getClusterExpansionZoom(feature)
        const coords = (feature.geometry as GeoJSON.Point).coordinates as [number, number]
        if (zoom !== undefined) onPressCluster(coords, zoom)
        return
      }
      const location = locations.find((l) => l.id === feature.properties?.id)
      if (location) onPressSpot(location)
    },
    [locations, onPressSpot, onPressCluster],
  )

  return (
    <>
      <PinImages key={loadedMapStyle} />

      <ShapeSource
        ref={sourceRef}
        id="spots"
        shape={spots}
        cluster
        clusterRadius={CLUSTER_RADIUS}
        clusterMaxZoomLevel={CLUSTER_MAX_ZOOM}
        hitbox={HITBOX}
        onPress={handlePress}
      >
        <CircleLayer id="cluster-circles" filter={IS_CLUSTER} style={themed.clusterCircle} />
        <SymbolLayer id="cluster-count" filter={IS_CLUSTER} style={themed.clusterCount} />
        <CircleLayer id="spot-shadows" filter={NOT_CLUSTER} style={PIN_SHADOW} />
        <CircleLayer id="spot-circles" filter={NOT_CLUSTER} style={PIN_CIRCLE} />
        <SymbolLayer id="spot-icons" filter={NOT_CLUSTER} style={PIN_ICON} />
        <SymbolLayer id="spot-labels" filter={NOT_CLUSTER} minZoomLevel={LABEL_MIN_ZOOM} style={themed.pinLabel} />
      </ShapeSource>

      {/* Kept out of the clustered source so the spot being viewed is always visible. */}
      <ShapeSource id="selected-spot" shape={selected}>
        <CircleLayer id="selected-shadow" style={SELECTED_SHADOW} />
        <CircleLayer id="selected-circle" style={themed.selectedCircle} />
        <SymbolLayer id="selected-icon" style={SELECTED_ICON} />
        <SymbolLayer id="selected-label" style={themed.selectedLabel} />
      </ShapeSource>
    </>
  )
})
