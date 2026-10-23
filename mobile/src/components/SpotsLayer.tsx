import { useMemo, useRef } from 'react'
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

interface SpotsLayerProps {
  locations: Location[]
  selectedId: string | null
  colors: ThemeColors
  onPressSpot: (location: Location) => void
  onPressCluster: (coordinates: [number, number], expansionZoom: number) => void
}

export function SpotsLayer({ locations, selectedId, colors, onPressSpot, onPressCluster }: SpotsLayerProps) {
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

  const pinCircle = {
    circleRadius: 14,
    circleColor: ['get', 'color'],
    circleStrokeColor: PIN_RING,
    circleStrokeWidth: 2.5,
  } as const
  // A blurred circle offset below the pin, standing in for a drop shadow.
  const pinShadow = {
    circleRadius: 17,
    circleColor: '#000000',
    circleOpacity: 0.22,
    circleBlur: 0.7,
    circleTranslate: [0, 2] as [number, number],
  } as const
  const pinIcon = {
    iconImage: ICON_IMAGE,
    iconSize: 0.85,
    iconAllowOverlap: true,
    iconIgnorePlacement: true,
  } as const
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

  return (
    <>
      <Images>
        {Object.entries(CATEGORY_META).map(([key, { Icon }]) => (
          <Image key={key} name={`icon-${key}`}>
            <View style={{ width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }}>
              <Icon size={18} color="#ffffff" strokeWidth={2.4} />
            </View>
          </Image>
        ))}
      </Images>

      <ShapeSource
        ref={sourceRef}
        id="spots"
        shape={spots}
        cluster
        clusterRadius={CLUSTER_RADIUS}
        clusterMaxZoomLevel={CLUSTER_MAX_ZOOM}
        hitbox={{ width: 28, height: 28 }}
        onPress={async (event) => {
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
        }}
      >
        <CircleLayer
          id="cluster-circles"
          filter={IS_CLUSTER}
          // Neutral rather than a busy color, so a cluster never reads as one tier.
          style={{
            circleColor: colors.text,
            circleStrokeColor: PIN_RING,
            circleStrokeWidth: 2.5,
            circleRadius: ['step', ['get', 'point_count'], 17, 10, 21, 25, 25],
          }}
        />
        <SymbolLayer
          id="cluster-count"
          filter={IS_CLUSTER}
          style={{
            textField: ['get', 'point_count_abbreviated'],
            textFont: TEXT_FONT,
            textSize: 14,
            textColor: colors.background,
            textAllowOverlap: true,
            textIgnorePlacement: true,
          }}
        />
        <CircleLayer id="spot-shadows" filter={NOT_CLUSTER} style={pinShadow} />
        <CircleLayer id="spot-circles" filter={NOT_CLUSTER} style={pinCircle} />
        <SymbolLayer id="spot-icons" filter={NOT_CLUSTER} style={pinIcon} />
        <SymbolLayer id="spot-labels" filter={NOT_CLUSTER} minZoomLevel={LABEL_MIN_ZOOM} style={pinLabel} />
      </ShapeSource>

      {/* Kept out of the clustered source so the spot being viewed is always visible. */}
      <ShapeSource id="selected-spot" shape={selected}>
        <CircleLayer id="selected-shadow" style={{ ...pinShadow, circleRadius: 23 }} />
        <CircleLayer
          id="selected-circle"
          style={{ ...pinCircle, circleRadius: 19, circleStrokeColor: colors.text, circleStrokeWidth: 3 }}
        />
        <SymbolLayer id="selected-icon" style={{ ...pinIcon, iconSize: 1.1 }} />
        <SymbolLayer
          id="selected-label"
          style={{ ...pinLabel, textSize: 13, textOffset: [0, 2], textOptional: false, textAllowOverlap: true }}
        />
      </ShapeSource>
    </>
  )
}
