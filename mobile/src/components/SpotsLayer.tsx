import { useMemo } from 'react'
import { CircleLayer, ShapeSource } from '@rnmapbox/maps'
import { busyTierHex } from '../lib/busyTier'
import type { Location } from '../types/location'

// Mirrors getBusyTier: <=3 low, 4-7 moderate, >=8 high.
const TIER_COLOR = [
  'step',
  ['get', 'busyScore'],
  busyTierHex.low,
  4,
  busyTierHex.moderate,
  8,
  busyTierHex.high,
] as const
const IS_SELECTED = ['get', 'selected'] as const

interface SpotsLayerProps {
  locations: Location[]
  selectedId: string | null
  onPressSpot: (location: Location) => void
}

// One native circle layer for every pin — far cheaper than a view-backed annotation per spot.
export function SpotsLayer({ locations, selectedId, onPressSpot }: SpotsLayerProps) {
  const shape = useMemo<GeoJSON.FeatureCollection<GeoJSON.Point>>(
    () => ({
      type: 'FeatureCollection',
      features: locations.map((location) => ({
        type: 'Feature',
        id: location.id,
        properties: {
          id: location.id,
          busyScore: location.busyScore,
          selected: location.id === selectedId,
        },
        geometry: { type: 'Point', coordinates: [location.lng, location.lat] },
      })),
    }),
    [locations, selectedId],
  )

  return (
    <ShapeSource
      id="spots"
      shape={shape}
      hitbox={{ width: 28, height: 28 }}
      onPress={(event) => {
        const id = event.features[0]?.properties?.id
        const location = locations.find((l) => l.id === id)
        if (location) onPressSpot(location)
      }}
    >
      <CircleLayer
        id="spot-circles"
        style={{
          circleSortKey: ['case', IS_SELECTED, 1, 0],
          circleRadius: ['case', IS_SELECTED, 10, 7],
          circleColor: TIER_COLOR,
          circleStrokeColor: ['case', IS_SELECTED, '#ffffff', TIER_COLOR],
          circleStrokeOpacity: ['case', IS_SELECTED, 1, 0.4],
          circleStrokeWidth: ['case', IS_SELECTED, 3, 5],
        }}
      />
    </ShapeSource>
  )
}
