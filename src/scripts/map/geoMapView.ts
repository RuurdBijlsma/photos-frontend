import type { MapPhotoItem } from '@/scripts/types/generated/timeline.ts'

const DEFAULT_CENTER = { lon: 5.2913, lat: 52.1326 }
const DEFAULT_ZOOM = 8

/** Approximate center/zoom from geo items so the map opens in the right area immediately. */
export function computeGeoMapView(items: MapPhotoItem[]): {
  center: { lon: number; lat: number }
  zoom: number
} {
  const valid = items.filter((item) => item.latitude !== 0 || item.longitude !== 0)
  if (valid.length === 0) {
    return { center: DEFAULT_CENTER, zoom: DEFAULT_ZOOM }
  }

  let minLon = Infinity
  let maxLon = -Infinity
  let minLat = Infinity
  let maxLat = -Infinity

  for (const item of valid) {
    minLon = Math.min(minLon, item.longitude)
    maxLon = Math.max(maxLon, item.longitude)
    minLat = Math.min(minLat, item.latitude)
    maxLat = Math.max(maxLat, item.latitude)
  }

  const center = {
    lon: (minLon + maxLon) / 2,
    lat: (minLat + maxLat) / 2,
  }

  if (valid.length === 1) {
    return { center, zoom: 14 }
  }

  const lngSpan = Math.max(maxLon - minLon, 0.02)
  const latSpan = Math.max(maxLat - minLat, 0.02)
  const span = Math.max(lngSpan, latSpan)
  const zoom = Math.min(14, Math.max(2, Math.log2(360 / span) - 0.75))

  return { center, zoom }
}
