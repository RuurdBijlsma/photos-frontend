<script setup lang="ts">
import { onUnmounted, ref } from 'vue'
import maplibregl, { type Map as LibreMap, type MapOptions } from 'maplibre-gl'
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
import SimpleTimeline from '@/vues/components/timeline/simple-timeline/SimpleTimeline.vue'

// TODO:
// Close sidebar functionality
// Resize sidebar by dragging gap between simpletimeline and map view (remember size with vueuse useStorage)
// Select (click on) cluster -> show photos from that cluster in sidebar & open popup above marker showing the photo.
// Select photo/video -> Show popup above marker showing the photo/video
// Click popup -> open media item in ViewPhoto viewer
// Popup should have a subtle button to close the popup (top right)
// sidebar should reflect which media items are currently in viewport, unless a cluster is selected, then show items for that cluster, and a button to return back to "in-view" mode

const markers: Record<string, maplibregl.Marker> = {}
const clusterPreviewCache = new globalThis.Map<number, SimpleTimelineItem>()
let updateRun = 0
let initialized = false
const mapPhotos = ref<MapPhotosResponse | null>(null)
let map: LibreMap | null = null

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

  const bounds = locations.reduce(
    (photoBounds, item) => {
      return photoBounds.extend([item.longitude, item.latitude])
    },
    new maplibregl.LngLatBounds(getLngLat(locations[0]), getLngLat(locations[0])),
  )

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

function getFeatureCoordinates(feature: maplibregl.MapGeoJSONFeature): [number, number] {
  return (feature.geometry as GeoJSON.Point).coordinates as [number, number]
}

function handleMapLoad(loadedMap: LibreMap) {
  map = loadedMap
  initialize()
}

mediaItemService.listMapPhotos().then((loadedPhotos) => {
  mapPhotos.value = loadedPhotos
  mapOptions.value = getInitialMapOptions(loadedPhotos)
  initialize()
})

async function initialize() {
  if (map === null || mapPhotos.value === null) return
  if (initialized) return
  initialized = true
  const loadedMap = map

  addPhotoSource(loadedMap, mapPhotos.value)
  addHelperLayers(loadedMap)

  const updateMarkers = () => syncVisibleMarkers(loadedMap)
  const throttledUpdate = useThrottleFn(updateMarkers, 50)

  loadedMap.on('zoomend', throttledUpdate)
  loadedMap.on('move', throttledUpdate)
  loadedMap.on('moveend', throttledUpdate)
  loadedMap.on(
    'data',
    (e: maplibregl.MapDataEvent & { sourceId?: string; isSourceLoaded?: boolean }) => {
      if (e.sourceId === 'photos' && e.isSourceLoaded) throttledUpdate()
    },
  )
  updateMarkers()
}

function createPhotosGeoJson(photos: MapPhotosResponse): GeoJSON.FeatureCollection<GeoJSON.Point> {
  return {
    type: 'FeatureCollection',
    features: getValidPhotoLocations(photos).map((p) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: getLngLat(p),
      },
      properties: {
        id: p.item?.id,
        hasThumbnails: p.item?.hasThumbnails,
        isVideo: p.item?.isVideo,
        durationMs: p.item?.durationMs,
        ratio: p.item?.ratio,
      },
    })),
  }
}

function addPhotoSource(loadedMap: LibreMap, photos: MapPhotosResponse) {
  loadedMap.addSource('photos', {
    type: 'geojson',
    data: createPhotosGeoJson(photos),
    cluster: true,
    clusterMaxZoom: 14,
    clusterRadius: 50,
  })
}

function addHelperLayers(loadedMap: LibreMap) {
  // Invisible helper layers keep MapLibre's spatial index available while
  // viewport-scoped DOM markers render only what is on screen.
  loadedMap.addLayer({
    id: 'cluster-helper',
    type: 'circle',
    source: 'photos',
    filter: ['has', 'point_count'],
    paint: {
      'circle-radius': 30,
      'circle-opacity': 0,
    },
  })

  loadedMap.addLayer({
    id: 'unclustered-point-helper',
    type: 'circle',
    source: 'photos',
    filter: ['!', ['has', 'point_count']],
    paint: {
      'circle-radius': 20,
      'circle-opacity': 0, // Hidden but detectable
    },
  })
}

async function syncVisibleMarkers(loadedMap: LibreMap) {
  const run = ++updateRun
  const source = loadedMap.getSource('photos') as maplibregl.GeoJSONSource
  const clusterFeatures = loadedMap.queryRenderedFeatures({ layers: ['cluster-helper'] })
  const pointFeatures = loadedMap.queryRenderedFeatures({ layers: ['unclustered-point-helper'] })
  const newMarkers: Record<string, maplibregl.Marker> = {}

  for (const feature of clusterFeatures) {
    const clusterId = Number(feature.properties.cluster_id)
    const count = Number(feature.properties.point_count)
    const coords = getFeatureCoordinates(feature)
    let previewItem = clusterPreviewCache.get(clusterId)

    if (!previewItem) {
      const leaves = await source.getClusterLeaves(clusterId, 1, 0)
      if (run !== updateRun) return
      previewItem = getItemFromProperties(leaves[0]?.properties ?? undefined)
      if (!previewItem) continue
      clusterPreviewCache.set(clusterId, previewItem)
    }

    addOrUpdateClusterMarker(loadedMap, clusterId, previewItem, count, coords, newMarkers)
  }

  for (const feature of pointFeatures) {
    const item = getItemFromProperties(feature.properties)
    if (!item) continue

    addOrUpdatePhotoMarker(loadedMap, item, getFeatureCoordinates(feature), newMarkers)
  }

  removeHiddenMarkers(newMarkers)
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

function addOrUpdateClusterMarker(
  loadedMap: LibreMap,
  clusterId: number,
  item: SimpleTimelineItem,
  count: number,
  coords: [number, number],
  visibleMarkers: Record<string, maplibregl.Marker>,
) {
  const key = `cluster-${clusterId}`
  return addOrUpdateMarker(
    loadedMap,
    key,
    coords,
    visibleMarkers,
    () => createClusterMarkerElement(item, count),
    (el) => updateClusterMarkerElement(el, count),
  )
}

function addOrUpdatePhotoMarker(
  loadedMap: LibreMap,
  item: SimpleTimelineItem,
  coords: [number, number],
  visibleMarkers: Record<string, maplibregl.Marker>,
) {
  const key = `photo-${item.id}`
  if (visibleMarkers[key]) return visibleMarkers[key]

  return addOrUpdateMarker(loadedMap, key, coords, visibleMarkers, () =>
    createPhotoMarkerElement(item),
  )
}

function addOrUpdateMarker(
  loadedMap: LibreMap,
  key: string,
  coords: [number, number],
  visibleMarkers: Record<string, maplibregl.Marker>,
  createElement: () => HTMLElement,
  updateElement?: (el: HTMLElement) => void,
) {
  let marker = markers[key]
  if (!marker) {
    marker = markers[key] = new maplibregl.Marker({
      element: createElement(),
      anchor: 'center',
    }).setLngLat(coords)
  } else {
    marker.setLngLat(coords)
    updateElement?.(marker.getElement())
  }

  visibleMarkers[key] = marker
  if (!marker.getElement().parentElement) marker.addTo(loadedMap)
  return marker
}

function removeHiddenMarkers(visibleMarkers: Record<string, maplibregl.Marker>) {
  for (const key in markers) {
    if (!visibleMarkers[key]) {
      markers[key].remove()
      delete markers[key]
    }
  }
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
  <div class="outer-layout">
    <main-layout-container class="map-layout">
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
    <simple-timeline
      class="timeline"
      v-if="mapPhotos"
      :timeline-items="mapPhotos.items.map((p) => p.item).filter((p) => !!p)"
      view-link="/map/view/"
    >
      <div class="timeline-header">
        <h2>Photos in view</h2>
        <v-spacer />
        <v-btn
          icon
          density="compact"
          color="primary"
          variant="text"
          v-tooltip="{
            location: 'top',
            text: 'Close sidebar',
          }"
        >
          <v-icon size="18" icon="mdi-chevron-right" />
        </v-btn>
      </div>
    </simple-timeline>
  </div>
</template>

<style>
.outer-layout {
  height: 100%;
  width: 100%;
  display: flex;
  gap: 5px;
}

.map-layout {
  width: calc(100% - 405px) !important;
}

.timeline {
  width: 400px !important;
}

.timeline-header {
  padding: 15px 20px;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
}

.timeline h2 {
  font-weight: 500;
  font-size: 20px;
  color: rgba(var(--v-theme-on-surface-variant));
}

.map-wrapper {
  width: 100%;
  height: 100%;
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
