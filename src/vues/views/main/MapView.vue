<script setup lang="ts">
import { onUnmounted, ref } from 'vue'
import { type Map, type MapOptions } from 'maplibre-gl'
import maplibregl from 'maplibre-gl'
import BaseMap from '@/vues/components/map/BaseMap.vue'
import MainLayoutContainer from '@/vues/components/MainLayoutContainer.vue'
import mediaItemService from '@/scripts/services/mediaItemService.ts'
import { getThumbnailHeight } from '@/scripts/utils.ts'
import { useThrottleFn } from '@vueuse/core'
import type {
  MapPhotoItem,
  MapPhotosResponse,
  SimpleTimelineItem,
} from '@/scripts/types/generated/timeline.ts'

const markers: Record<string, maplibregl.Marker> = {}
const clusterPreviewCache = new globalThis.Map<number, SimpleTimelineItem>()
let updateRun = 0
let mapPhotos: MapPhotosResponse | null = null
let map: Map | null = null

type MapOptionsWithoutContainer = Omit<MapOptions, 'container' | 'style'>

const mapOptions = ref<MapOptionsWithoutContainer | null>(null)
const DEFAULT_MAP_OPTIONS = {
  center: { lat: 40, lng: 0 },
  zoom: 3,
  attributionControl: {
    compact: true,
  },
} satisfies MapOptionsWithoutContainer

function getValidPhotoLocations(photos: MapPhotosResponse) {
  return photos.items.filter(
    (item) =>
      Number.isFinite(item.latitude) &&
      Number.isFinite(item.longitude) &&
      item.latitude >= -90 &&
      item.latitude <= 90 &&
      item.longitude >= -180 &&
      item.longitude <= 180,
  )
}

function getInitialMapOptions(photos: MapPhotosResponse): MapOptionsWithoutContainer {
  const locations = getValidPhotoLocations(photos)
  if (locations.length === 0) return DEFAULT_MAP_OPTIONS

  if (locations.length === 1) {
    const [location] = locations
    return {
      ...DEFAULT_MAP_OPTIONS,
      center: getLngLat(location),
      zoom: 11,
    }
  }

  const bounds = locations.reduce((photoBounds, item) => {
    return photoBounds.extend([item.longitude, item.latitude])
  }, new maplibregl.LngLatBounds(getLngLat(locations[0]), getLngLat(locations[0])))

  return {
    ...DEFAULT_MAP_OPTIONS,
    bounds,
    fitBoundsOptions: {
      padding: 80,
      maxZoom: 14,
    },
  }
}

function getLngLat(item: MapPhotoItem): [number, number] {
  return [item.longitude, item.latitude]
}

function handleMapLoad(loadedMap: Map) {
  map = loadedMap
  initialize()
}

mediaItemService.listMapPhotos().then((loadedPhotos) => {
  mapPhotos = loadedPhotos
  mapOptions.value = getInitialMapOptions(loadedPhotos)
  initialize()
})

async function initialize() {
  if (map === null || mapPhotos === null) return

  map.addSource('photos', {
    type: 'geojson',
    data: {
      type: 'FeatureCollection',
      features: mapPhotos.items.map((p) => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [p.longitude, p.latitude],
        },
        properties: {
          id: p.item?.id,
          hasThumbnails: p.item?.hasThumbnails,
          isVideo: p.item?.isVideo,
          durationMs: p.item?.durationMs,
          ratio: p.item?.ratio,
        },
      })),
    },
    cluster: true,
    clusterMaxZoom: 14,
    clusterRadius: 50,
  })

  // Invisible helper layers keep MapLibre's spatial index available while
  // viewport-scoped DOM markers render only what is on screen.
  map.addLayer({
    id: 'cluster-helper',
    type: 'circle',
    source: 'photos',
    filter: ['has', 'point_count'],
    paint: {
      'circle-radius': 30,
      'circle-opacity': 0,
    },
  })

  map.addLayer({
    id: 'unclustered-point-helper',
    type: 'circle',
    source: 'photos',
    filter: ['!', ['has', 'point_count']],
    paint: {
      'circle-radius': 20,
      'circle-opacity': 0, // Hidden but detectable
    },
  })

  const updateMarkers = async () => {
    if (map === null) return
    const run = ++updateRun
    const source = map.getSource('photos') as maplibregl.GeoJSONSource
    const clusterFeatures = map.queryRenderedFeatures({ layers: ['cluster-helper'] })
    const pointFeatures = map.queryRenderedFeatures({ layers: ['unclustered-point-helper'] })
    const newMarkers: Record<string, maplibregl.Marker> = {}

    for (const feature of clusterFeatures) {
      const clusterId = Number(feature.properties.cluster_id)
      const key = `cluster-${clusterId}`
      const coords = (feature.geometry as any).coordinates
      const count = Number(feature.properties.point_count)
      let previewItem = clusterPreviewCache.get(clusterId)

      if (!previewItem) {
        const leaves = await source.getClusterLeaves(clusterId, 1, 0)
        if (run !== updateRun) return
        previewItem = getItemFromProperties(leaves[0]?.properties ?? undefined)
        if (!previewItem) continue
        clusterPreviewCache.set(clusterId, previewItem)
      }

      let marker = markers[key]
      if (!marker) {
        const el = createClusterMarkerElement(previewItem, count)
        marker = markers[key] = new maplibregl.Marker({
          element: el,
          anchor: 'center',
        }).setLngLat(coords)
      } else {
        marker.setLngLat(coords)
        updateClusterMarkerElement(marker.getElement(), count)
      }

      newMarkers[key] = marker
      if (!marker.getElement().parentElement) marker.addTo(map)
    }

    for (const feature of pointFeatures) {
      const item = getItemFromProperties(feature.properties)
      if (!item) continue

      const key = `photo-${item.id}`
      const coords = (feature.geometry as any).coordinates

      if (newMarkers[key]) continue

      let marker = markers[key]
      if (!marker) {
        const el = createPhotoMarkerElement(item)
        marker = markers[key] = new maplibregl.Marker({
          element: el,
          anchor: 'center',
        }).setLngLat(coords)
      } else {
        marker.setLngLat(coords)
      }

      newMarkers[key] = marker
      if (!marker.getElement().parentElement) marker.addTo(map)
    }

    for (const key in markers) {
      if (!newMarkers[key]) {
        markers[key].remove()
        delete markers[key]
      }
    }
  }

  const throttledUpdate = useThrottleFn(updateMarkers, 50)

  map.on('zoomend', throttledUpdate)
  map.on('move', throttledUpdate)
  map.on('moveend', throttledUpdate)
  map.on('data', (e: maplibregl.MapDataEvent & { sourceId?: string; isSourceLoaded?: boolean }) => {
    if (e.sourceId === 'photos' && e.isSourceLoaded) throttledUpdate()
  })

  // Initial call
  updateMarkers()
}

const getItemFromProperties = (properties: maplibregl.GeoJSONFeature['properties'] | undefined) => {
  if (!properties?.id) return undefined
  const ratio = Number(properties.ratio)
  return {
    id: String(properties.id),
    isVideo: Boolean(properties.isVideo),
    hasThumbnails: Boolean(properties.hasThumbnails),
    durationMs: Number(properties.durationMs) || undefined,
    ratio: Number.isFinite(ratio) && ratio > 0 ? ratio : 1,
  } satisfies SimpleTimelineItem
}

const getThumbnailUrl = (item: SimpleTimelineItem, markerHeight: number) => {
  return mediaItemService.getPhotoThumbnail(
    item.id,
    getThumbnailHeight(markerHeight),
    !item.hasThumbnails,
  )
}

const createPhotoMarkerElement = (item: SimpleTimelineItem) => {
  const el = document.createElement('div')
  const imageArea = 2500
  const markerWidth = Math.sqrt(imageArea * item.ratio)
  const markerHeight = Math.sqrt(imageArea * (1 / item.ratio))
  el.className = 'map-photo-marker'
  el.style.width = `${Math.round(markerWidth)}px`
  el.style.height = `${markerHeight}px`
  el.style.backgroundImage = `url(${getThumbnailUrl(item, markerHeight)})`
  return el
}

const createClusterMarkerElement = (item: SimpleTimelineItem, count: number) => {
  const el = document.createElement('div')
  const visual = document.createElement('div')
  const badge = document.createElement('span')
  el.className = 'map-cluster-marker'
  visual.className = 'map-cluster-visual'
  badge.className = 'map-cluster-count'
  visual.style.backgroundImage = `url(${getThumbnailUrl(item, 52)})`
  visual.append(badge)
  el.append(visual)
  updateClusterMarkerElement(el, count)
  return el
}

const updateClusterMarkerElement = (el: HTMLElement, count: number) => {
  const badge = el.querySelector<HTMLElement>('.map-cluster-count')
  if (badge) badge.textContent = String(count)
}

onUnmounted(() => {
  Object.values(markers).forEach((m) => m.remove())
  clusterPreviewCache.clear()
})
</script>

<template>
  <main-layout-container>
    <!-- Ensure the container has height -->
    <v-theme-provider with-background class="map-wrapper" theme="light">
      <base-map
        v-if="mapOptions"
        class="map-instance"
        :map-options="mapOptions"
        @load="handleMapLoad"
      />
      <div v-else class="map-loading">
        <v-progress-circular indeterminate color="primary" />
      </div>
    </v-theme-provider>
  </main-layout-container>
</template>

<style>
.map-wrapper {
  width: 100%;
  height: 80vh;
  position: relative;
}

/* Ensure the MapLibre container fills its parent */
.map-instance,
.map-instance > div {
  width: 100%;
  height: 100%;
}

.map-loading {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
}

.map-photo-marker,
.map-cluster-visual {
  background-color: rgba(20, 20, 24, 0.65);
  background-position: center;
  background-repeat: no-repeat;
  background-size: cover;
  border: 2px solid white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
  cursor: pointer;
}

.map-photo-marker {
  border-radius: 8px;
  overflow: hidden;
}

.map-cluster-marker {
  width: 52px;
  height: 52px;
  cursor: pointer;
  overflow: visible;
}

.map-cluster-visual {
  width: 100%;
  height: 100%;
  position: relative;
  border-radius: 50%;
  overflow: visible;
}

.map-cluster-count {
  position: absolute;
  right: -7px;
  top: -7px;
  min-width: 22px;
  height: 22px;
  padding: 0 5px;
  border-radius: 999px;
  border: 2px solid white;
  box-sizing: border-box;
  background: rgb(var(--v-theme-primary));
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  line-height: 1;
  text-align: center;
  box-shadow: 0 2px 7px rgba(0, 0, 0, 0.3);
  pointer-events: none;
  z-index: 1;
}

.map-photo-marker:hover,
.map-cluster-marker:hover .map-cluster-visual {
  box-shadow:
    0 2px 8px rgba(0, 0, 0, 0.35),
    0 0 0 3px rgba(255, 255, 255, 0.35);
  z-index: 10;
}
</style>
