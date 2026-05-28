<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref, useTemplateRef, watch } from 'vue'
import maplibregl, { type Map as LibreMap, type MapOptions } from 'maplibre-gl'
import BaseMap, { type StyleName } from '@/vues/components/map/BaseMap.vue'
import MainLayoutContainer from '@/vues/components/MainLayoutContainer.vue'
import mediaItemService from '@/scripts/services/mediaItemService.ts'
import { getThumbnailHeight, getVideoHeight } from '@/scripts/utils.ts'
import { useEventListener, useResizeObserver, useStorage, useThrottleFn } from '@vueuse/core'
import type {
  MapPhotoItem,
  MapPhotosResponse,
  SimpleTimelineItem,
} from '@/scripts/types/generated/timeline.ts'
import SimpleTimeline from '@/vues/components/timeline/simple-timeline/SimpleTimeline.vue'
import { useRouter } from 'vue-router'
import MapDateFilter from '@/vues/components/map/MapDateFilter.vue'

const markers: Record<string, maplibregl.Marker> = {}
const clusterPreviewCache = new Map<number, SimpleTimelineItem>()
let updateRun = 0
let initialized = false
const mapPhotos = ref<MapPhotosResponse | null>(null)
let map: null | maplibregl.Map = null

const dateFilter = ref({
  startDate: null as Date | null,
  endDate: null as Date | null,
  active: false,
  startGranularity: 'month' as 'month' | 'day',
  endGranularity: 'month' as 'month' | 'day',
})

async function fetchMapPhotos(start: Date | null, end: Date | null) {
  const startStr = start?.toISOString()
  const endStr = end?.toISOString()

  try {
    const loadedPhotos = await mediaItemService.listMapPhotos(startStr, endStr)
    photoIdToOrder.clear()
    loadedPhotos.items.forEach((p, index) => {
      if (p.item?.id) {
        photoIdToOrder.set(p.item.id, index)
      }
    })
    mapPhotos.value = loadedPhotos
    clearMarkerSelection()
  } catch (err) {
    console.error('Failed to list map photos with date filter:', err)
  }
}

const throttledFetchMapPhotos = useThrottleFn(fetchMapPhotos, 100)

function handleDateFilterChange(payload: { isDragging: boolean }) {
  const start = dateFilter.value.active ? dateFilter.value.startDate : null
  const end = dateFilter.value.active ? dateFilter.value.endDate : null

  if (payload.isDragging) {
    throttledFetchMapPhotos(start, end)
  } else {
    fetchMapPhotos(start, end)
  }
}
let popupMarker: maplibregl.Marker | null = null
const router = useRouter()
const outerLayoutEl = useTemplateRef('outerLayout')
const photoIdToOrder = new Map<string, number>()

const MIN_MAP_WIDTH = 400
const MIN_SIDEBAR_WIDTH = 200
const SIDEBAR_GAP = 5
const CLOSE_DRAG_THRESHOLD = 50

const sidebarOpen = useStorage('mapSidebarOpen', true)
const sidebarWidth = useStorage('mapSidebarWidth', window.innerWidth / 3)
const isResizingSidebar = ref(false)
const visibleItems = ref<SimpleTimelineItem[]>([])
const selectedClusterItems = ref<SimpleTimelineItem[] | null>(null)
const selectedMarkerKey = ref<string | null>(null)
const selectedPopupItem = ref<SimpleTimelineItem | null>(null)
const selectedLngLat = ref<[number, number] | null>(null)

type MapOptionsWithoutContainer = Omit<MapOptions, 'container' | 'style'>

const mapOptions = ref<MapOptionsWithoutContainer | null>(null)

const currentStyle = useStorage<StyleName>('mapStyle', 'LIBERTY')
const isStyleSelectorHovered = ref(false)

const MAP_STYLES = [
  { key: 'LIBERTY', label: 'Light Map', thumb: 'img/map-thumb/LIBERTY.png' },
  { key: 'SATELLITE', label: 'Satellite', thumb: 'img/map-thumb/SATELLITE.png' },
  { key: 'TERRAIN', label: 'Terrain', thumb: 'img/map-thumb/TERRAIN.png' },
  { key: 'WATERCOLOR', label: 'Watercolor', thumb: 'img/map-thumb/WATERCOLOR.png' },
  { key: 'DARK_COLORFUL', label: 'Dark Map', thumb: 'img/map-thumb/DARK_COLORFUL.png' },
] as const

const nextStyle = computed(() => {
  const currentIndex = MAP_STYLES.findIndex((s) => s.key === currentStyle.value)
  const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % MAP_STYLES.length
  return MAP_STYLES[nextIndex]
})

function cycleStyle() {
  currentStyle.value = nextStyle.value.key
}

function handleStyleLoad(loadedMap: LibreMap) {
  if (mapPhotos.value === null) return

  // Re-add sources and layers if they are missing after style change
  if (!loadedMap.getSource('photos')) {
    addPhotoSource(loadedMap, mapPhotos.value)
    addHelperLayers(loadedMap)
  }
}
const DEFAULT_MAP_OPTIONS = {
  center: { lat: 40, lng: 0 },
  zoom: 3,
  attributionControl: {
    compact: true,
  },
} satisfies MapOptionsWithoutContainer

const photoItems = computed(() => {
  return mapPhotos.value?.items.map((p) => p.item).filter((p) => !!p) ?? []
})
const timelineItems = computed(() => {
  const items = selectedClusterItems.value ?? visibleItems.value

  return items.sort((a, b) => {
    const orderA = photoIdToOrder.get(a.id) ?? 0
    const orderB = photoIdToOrder.get(b.id) ?? 0
    return orderA - orderB
  })
})
const resolvedSidebarWidth = computed(() => {
  const maxWidth = getMaxSidebarWidth()
  return Math.round(Math.min(Math.max(sidebarWidth.value, MIN_SIDEBAR_WIDTH), maxWidth))
})
const layoutStyle = computed(() => ({
  '--map-sidebar-width': sidebarOpen.value ? `${resolvedSidebarWidth.value}px` : '0px',
}))

function getMaxSidebarWidth() {
  const layoutWidth = outerLayoutEl.value?.getBoundingClientRect().width ?? window.innerWidth
  return Math.max(MIN_SIDEBAR_WIDTH, layoutWidth - MIN_MAP_WIDTH - SIDEBAR_GAP)
}

function requestMapResize() {
  nextTick(() => {
    map?.resize()
    window.setTimeout(() => map?.resize(), 220)
  })
}

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
  loadedPhotos.items.forEach((p, index) => {
    if (p.item?.id) {
      photoIdToOrder.set(p.item.id, index)
    }
  })
  mapPhotos.value = loadedPhotos
  mapOptions.value = getInitialMapOptions(loadedPhotos)
  initialize()
})

async function initialize() {
  if (map === null || mapPhotos.value === null) return
  if (initialized) return
  initialized = true
  const loadedMap = map

  map.addControl(
    new maplibregl.NavigationControl({
      showCompass: true,
      showZoom: true,
      visualizePitch: true,
    }),
    'bottom-right',
  )

  if (!loadedMap.getSource('photos')) {
    addPhotoSource(loadedMap, mapPhotos.value)
    addHelperLayers(loadedMap)
  }

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
  loadedMap.on('click', clearMarkerSelection)
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
    clusterMaxZoom: 17, // Changing to 18 effectively keeps clustering through all zoom levels
    clusterRadius: 48,
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
  const visibleItemMap = new Map<string, SimpleTimelineItem>()

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

    const leaves = await source.getClusterLeaves(clusterId, count, 0)
    if (run !== updateRun) return
    leaves
      .map((leaf) => getItemFromProperties(leaf.properties))
      .filter((item) => !!item)
      .forEach((item) => visibleItemMap.set(item.id, item))
    addOrUpdateClusterMarker(loadedMap, clusterId, previewItem, count, coords, newMarkers)
  }

  for (const feature of pointFeatures) {
    const item = getItemFromProperties(feature.properties)
    if (!item) continue

    visibleItemMap.set(item.id, item)
    addOrUpdatePhotoMarker(loadedMap, item, getFeatureCoordinates(feature), newMarkers)
  }

  visibleItems.value = [...visibleItemMap.values()]
  removeHiddenMarkers(newMarkers)
  updateSelectedMarkerClasses()
}

const getItemFromProperties = (
  properties: maplibregl.GeoJSONFeature['properties'] | null | undefined,
) => {
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
  if (item.isVideo) el.classList.add('map-photo-marker-video')
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
    const element = createElement()
    element.addEventListener('click', (e) => {
      e.preventDefault()
      e.stopPropagation()
      const lngLat = markers[key]?.getLngLat()
      handleMarkerClick(key, lngLat ? [lngLat.lng, lngLat.lat] : coords)
    })
    marker = markers[key] = new maplibregl.Marker({
      element,
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

async function handleMarkerClick(key: string, coords: [number, number]) {
  if (selectedMarkerKey.value === key) {
    clearMarkerSelection()
    return
  }

  selectedMarkerKey.value = key
  selectedLngLat.value = coords
  updateSelectedMarkerClasses()

  if (key.startsWith('cluster-')) {
    const clusterId = Number(key.replace('cluster-', ''))
    await selectCluster(clusterId)
  } else {
    const item = photoItems.value.find((photoItem) => `photo-${photoItem.id}` === key)
    if (!item) return
    selectedClusterItems.value = null
    selectedPopupItem.value = item
    showPopup(item, coords)
  }
}

async function selectCluster(clusterId: number) {
  if (!map) return
  const source = map.getSource('photos') as maplibregl.GeoJSONSource
  const clusterFeature = map
    .queryRenderedFeatures({ layers: ['cluster-helper'] })
    .find((feature) => Number(feature.properties.cluster_id) === clusterId)
  const count = Number(clusterFeature?.properties.point_count)
  const leaves = await source.getClusterLeaves(clusterId, Number.isFinite(count) ? count : 100, 0)
  const items = leaves
    .map((leaf) => getItemFromProperties(leaf.properties))
    .filter((item) => !!item)
  selectedClusterItems.value = items
  selectedPopupItem.value = items[0] ?? null
  if (selectedPopupItem.value && selectedLngLat.value)
    showPopup(selectedPopupItem.value, selectedLngLat.value)
}

function clearMarkerSelection() {
  selectedClusterItems.value = null
  selectedMarkerKey.value = null
  selectedPopupItem.value = null
  selectedLngLat.value = null
  updateSelectedMarkerClasses()
  closePopup()
}

function updateSelectedMarkerClasses() {
  for (const [key, marker] of Object.entries(markers)) {
    marker.getElement().classList.toggle('map-marker-selected', key === selectedMarkerKey.value)
  }
}

function showPopup(item: SimpleTimelineItem, coords: [number, number]) {
  closePopup()
  if (!map) return
  const popupArea = 300 ** 2
  const popupWidth = Math.sqrt(popupArea * item.ratio)
  const popupHeight = Math.sqrt(popupArea * (1 / item.ratio))
  const popupEl = document.createElement('div')
  popupEl.style.width = `${popupWidth}px`
  popupEl.style.height = `${popupHeight}px`
  const closeButton = document.createElement('button')
  let mediaEl: HTMLImageElement | HTMLVideoElement
  popupEl.className = 'map-media-popup'
  if (item.isVideo) {
    const videoEl = document.createElement('video')
    videoEl.autoplay = true
    videoEl.muted = true
    videoEl.loop = true
    videoEl.playsInline = true
    videoEl.poster = getThumbnailUrl(item, 480)
    videoEl.src = mediaItemService.getVideo(item.id, getVideoHeight(480), !item.hasThumbnails)
    mediaEl = videoEl
  } else {
    const imageEl = document.createElement('img')
    imageEl.src = getThumbnailUrl(item, 480)
    imageEl.alt = ''
    mediaEl = imageEl
  }
  mediaEl.className = 'map-media-popup-image'
  closeButton.className = 'map-media-popup-close'
  closeButton.type = 'button'
  closeButton.textContent = '×'

  closeButton.addEventListener('click', (e) => {
    e.preventDefault()
    e.stopPropagation()
    clearMarkerSelection()
  })
  popupEl.addEventListener('click', (e) => {
    e.stopPropagation()
    router.push({ path: `/map/view/${item.id}` })
  })
  popupEl.append(mediaEl, closeButton)

  popupMarker = new maplibregl.Marker({
    element: popupEl,
    anchor: 'bottom',
    offset: [0, -38],
  })
    .setLngLat(coords)
    .addTo(map)
}

function zoomToFitAll() {
  if (!map || !mapPhotos.value) return
  const locations = getValidPhotoLocations(mapPhotos.value)
  if (locations.length === 0) return

  if (locations.length === 1) {
    const [location] = locations
    map.flyTo({
      center: getLngLat(location!),
      zoom: 11,
      essential: true,
    })
    return
  }

  const bounds = locations.reduce(
    (photoBounds, item) => {
      return photoBounds.extend([item.longitude, item.latitude])
    },
    new maplibregl.LngLatBounds(getLngLat(locations[0]!), getLngLat(locations[0]!)),
  )

  map.fitBounds(bounds, {
    padding: 80,
    maxZoom: 14,
    essential: true,
    duration: 1200,
  })
}

function closePopup() {
  popupMarker?.remove()
  popupMarker = null
}

function closeSidebar() {
  sidebarOpen.value = false
  requestMapResize()
}

function openSidebar() {
  sidebarOpen.value = true
  requestMapResize()
}

function startSidebarResize(e: MouseEvent) {
  if (!sidebarOpen.value || !outerLayoutEl.value) return
  e.preventDefault()
  isResizingSidebar.value = true
}

function updateSidebarResize(clientX: number) {
  if (!outerLayoutEl.value) return
  const rect = outerLayoutEl.value.getBoundingClientRect()
  if (clientX >= rect.right - CLOSE_DRAG_THRESHOLD) {
    closeSidebar()
    isResizingSidebar.value = false
    return
  }

  const rawWidth = rect.right - clientX
  sidebarWidth.value = Math.round(
    Math.min(Math.max(rawWidth, MIN_SIDEBAR_WIDTH), getMaxSidebarWidth()),
  )
  requestMapResize()
}

useEventListener(window, 'mousemove', (e: MouseEvent) => {
  if (!isResizingSidebar.value) return
  e.preventDefault()
  updateSidebarResize(e.clientX)
})

useEventListener(window, 'mouseup', () => {
  isResizingSidebar.value = false
})

useResizeObserver(outerLayoutEl, () => {
  sidebarWidth.value = resolvedSidebarWidth.value
  requestMapResize()
})

watch(sidebarOpen, requestMapResize)

watch(mapPhotos, (newPhotos) => {
  if (map && newPhotos) {
    const source = map.getSource('photos') as maplibregl.GeoJSONSource | undefined
    if (source) {
      source.setData(createPhotosGeoJson(newPhotos))
      map.triggerRepaint()
      setTimeout(() => {
        if (map) syncVisibleMarkers(map)
      }, 50)
    }
  }
})

onUnmounted(() => {
  Object.values(markers).forEach((m) => m.remove())
  closePopup()
  clusterPreviewCache.clear()
})
</script>

<template>
  <div
    ref="outerLayout"
    class="outer-layout"
    :class="{
      'sidebar-closed': !sidebarOpen,
      'sidebar-resizing': isResizingSidebar,
    }"
    :style="layoutStyle"
  >
    <main-layout-container class="map-layout">
      <v-theme-provider with-background class="map-wrapper" theme="light">
        <base-map
          :map-style="currentStyle"
          v-if="mapOptions"
          class="map-instance"
          :map-options="mapOptions"
          @load="handleMapLoad"
          @style-load="handleStyleLoad"
        />
        <div v-else class="map-loading">
          <v-progress-circular indeterminate color="primary" />
        </div>

        <!-- Date Range Filter -->
        <map-date-filter
          v-if="mapPhotos"
          v-model="dateFilter"
          @change="handleDateFilterChange"
        />

        <!-- Map Style / Layer Selector -->
        <div
          v-if="mapOptions"
          class="map-style-container"
          @mouseenter="isStyleSelectorHovered = true"
          @mouseleave="isStyleSelectorHovered = false"
        >
          <v-fade-transition>
            <v-card
              flat
              v-show="isStyleSelectorHovered"
              class="map-style-options-card"
              rounded="xl"
            >
              <div class="map-style-options-list">
                <div
                  v-for="style in MAP_STYLES"
                  :key="style.key"
                  class="map-style-option"
                  :class="{ active: currentStyle === style.key }"
                  @click="currentStyle = style.key"
                >
                  <div class="map-style-option-thumb-wrapper">
                    <v-img
                      :src="style.thumb"
                      cover
                      class="map-style-option-thumb"
                      :alt="style.label"
                    />
                    <v-icon
                      v-if="currentStyle === style.key"
                      color="primary"
                      icon="mdi-check-circle"
                      class="map-style-option-check"
                      size="20"
                    />
                  </div>
                  <span class="map-style-option-label">{{ style.label }}</span>
                </div>
              </div>
            </v-card>
          </v-fade-transition>

          <v-card class="map-style-trigger-card" elevation="6" rounded="xl" @click="cycleStyle">
            <v-img
              :src="nextStyle.thumb"
              cover
              class="map-style-trigger-thumb"
              :alt="nextStyle.label"
            >
              <div class="map-style-trigger-overlay">
                <span class="map-style-trigger-label">Layers</span>
              </div>
            </v-img>
          </v-card>
        </div>
        <v-btn
          v-if="!sidebarOpen"
          class="open-sidebar-btn"
          icon
          density="comfortable"
          color="primary"
          variant="elevated"
          v-tooltip="{
            location: 'left',
            text: 'Open sidebar',
          }"
          @click="openSidebar"
        >
          <v-icon size="20" icon="mdi-chevron-left" />
        </v-btn>
      </v-theme-provider>
    </main-layout-container>
    <div
      class="sidebar-resize-handle"
      :class="{ disabled: !sidebarOpen }"
      @mousedown="startSidebarResize"
    />
    <simple-timeline
      hide-drop-shadow
      class="timeline"
      v-if="mapPhotos"
      :timeline-items="timelineItems"
      view-link="/map/view/"
    >
      <div class="timeline-header">
        <div>
          <template v-if="selectedClusterItems">
            <div class="photo-count-header">
              <h2>Cluster</h2>
              <span class="photo-count">{{ timelineItems.length.toLocaleString() }}</span>
            </div>
            <v-btn
              density="compact"
              variant="plain"
              color="primary"
              class="return-cluster-button"
              rounded
              @click="clearMarkerSelection"
              prepend-icon="mdi-chevron-left"
            >
              Deselect
            </v-btn>
          </template>
          <template v-else>
            <div class="photo-count-header">
              <h2>In View</h2>
              <span class="photo-count">{{ timelineItems.length.toLocaleString() }}</span>
            </div>
          </template>
        </div>
        <v-spacer />
        <v-btn
          icon
          density="compact"
          color="primary"
          variant="text"
          @click="closeSidebar"
          v-tooltip="{
            location: 'top',
            text: 'Close sidebar',
          }"
        >
          <v-icon size="18" icon="mdi-chevron-right" />
        </v-btn>
      </div>

      <div v-if="timelineItems.length === 0" class="map-empty-state">
        <v-icon icon="mdi-map-search-outline" size="120" class="map-empty-icon" />
        <h3 class="map-empty-title">No items in this area</h3>
        <p class="map-empty-description">
          Move or zoom the map to find photos taken in other locations.
        </p>
        <v-btn
          color="primary"
          variant="tonal"
          rounded="xl"
          class="map-empty-button"
          prepend-icon="mdi-image-multiple-outline"
          @click="zoomToFitAll"
        >
          View All Photos
        </v-btn>
      </div>
    </simple-timeline>
  </div>
</template>

<style>
.outer-layout {
  height: 100%;
  width: 100%;
  display: grid;
  grid-template-columns: minmax(400px, 1fr) 5px var(--map-sidebar-width);
  transition: grid-template-columns 0.22s ease;
}

.outer-layout.sidebar-resizing {
  transition: none;
  user-select: none;
  cursor: col-resize;
}

.outer-layout.sidebar-closed {
  grid-template-columns: minmax(400px, 1fr) 0 0;
}

.map-layout {
  width: 100% !important;
  max-width: 100% !important;
  min-width: 0;
  overflow: hidden;
}

.timeline {
  width: var(--map-sidebar-width) !important;
  min-width: 0;
  overflow: hidden;
  transition:
    width 0.22s ease,
    opacity 0.18s ease;
}

.sidebar-resizing .timeline {
  transition: none;
}

.sidebar-closed .timeline {
  opacity: 0;
  pointer-events: none;
}

.sidebar-resize-handle {
  width: 5px;
  height: 100%;
  cursor: col-resize;
  z-index: 3;
}

.sidebar-resize-handle.disabled {
  opacity: 0;
  pointer-events: none;
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
  margin: 0;
}

.return-cluster-button {
  margin-left: -15px;
  transform: scale(0.9);
}

.photo-count-header {
  display: flex;
  align-items: center;
  gap: 10px;
}

.photo-count {
  color: rgba(var(--v-theme-on-surface-variant), 0.7);
  font-weight: 500;
  font-size: 20px;
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

.open-sidebar-btn {
  position: absolute !important;
  top: 16px;
  right: 16px;
  z-index: 2;
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
  z-index: 1;
}

.map-photo-marker {
  border-radius: 8px;
  overflow: hidden;
}

.map-photo-marker-video {
  border-color: #ff9800;
}

.map-cluster-marker {
  width: 52px;
  height: 52px;
  cursor: pointer;
  overflow: visible;
  z-index: 1;
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

.map-photo-marker.map-marker-selected,
.map-cluster-marker.map-marker-selected .map-cluster-visual {
  border-color: rgb(var(--v-theme-secondary));
  box-shadow:
    0 2px 8px rgba(0, 0, 0, 0.35),
    0 0 0 4px rgba(var(--v-theme-secondary), 0.45);
  z-index: 2;
}

.map-media-popup {
  position: relative;
  border: 2px solid rgba(255, 255, 255, 0.86);
  border-radius: 12px;
  background: rgba(20, 20, 24, 0.78);
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.35);
  cursor: pointer;
  z-index: 20;
}

.map-media-popup::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: -14px;
  width: 0;
  height: 0;
  border-left: 13px solid transparent;
  border-right: 13px solid transparent;
  border-top: 14px solid rgba(255, 255, 255, 0.86);
  transform: translateX(-50%);
}

.map-media-popup::before {
  content: '';
  position: absolute;
  left: 50%;
  bottom: -11px;
  width: 0;
  height: 0;
  border-left: 10px solid transparent;
  border-right: 10px solid transparent;
  border-top: 11px solid rgba(20, 20, 24, 0.78);
  transform: translateX(-50%);
  z-index: 1;
}

.map-media-popup-image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 10px;
}

.map-media-popup-close {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 26px;
  height: 26px;
  border: none;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.45);
  color: white;
  cursor: pointer;
  font-size: 18px;
  display: grid;
  place-items: center;
  z-index: 1;
}

.map-media-popup-close:hover {
  background: rgba(0, 0, 0, 0.68);
}

/* Map Style Selector */
.map-style-container {
  position: absolute;
  bottom: 12px;
  left: 12px;
  z-index: 2;
}

.map-style-trigger-card {
  width: 96px;
  height: 96px;
  cursor: pointer;
  overflow: hidden;
  border: 2px solid white;
  transition:
    transform 0.2s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.map-style-trigger-card:hover {
  transform: scale(1.05);
  border-color: rgba(var(--v-theme-primary), 0.8);
}

.map-style-trigger-thumb {
  width: 100%;
  height: 100%;
}

.map-style-trigger-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.45);
  color: white;
  text-align: center;
  font-size: 12px;
  font-weight: 600;
  padding: 4px 0;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.6);
  pointer-events: none;
}

.map-style-options-card {
  position: absolute;
  bottom: 100px;
  left: 0;
  z-index: 3;
  padding: 22px 15px;
  background-color: rgba(var(--v-theme-background), 0.7);
  backdrop-filter: saturate(250%) blur(12px) !important;
  border: 1px solid rgba(var(--v-theme-primary), 0.2);
}

/* Invisible bridge so mouse hover is not lost in the 12px gap between cards */
.map-style-options-card::after {
  content: '';
  position: absolute;
  bottom: -16px;
  left: 0;
  right: 0;
  height: 16px;
  background: transparent;
}

.map-style-options-list {
  display: flex;
  gap: 12px;
}

.map-style-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  width: 68px;
  text-align: center;
}

.map-style-option-thumb-wrapper {
  position: relative;
  width: 52px;
  height: 52px;
  border-radius: 15px;
  overflow: hidden;
  border: 2px solid transparent;
  transition:
    transform 0.2s ease,
    border-color 0.2s ease;
}

.map-style-option-thumb {
  width: 100%;
  height: 100%;
}

.map-style-option:hover .map-style-option-thumb-wrapper {
  transform: translateY(-2px);
  border-color: rgba(var(--v-theme-primary), 0.5);
}

.map-style-option.active .map-style-option-thumb-wrapper {
  border-color: rgb(var(--v-theme-primary));
  box-shadow: 0 0 0 2px rgba(var(--v-theme-primary), 0.2);
}

.map-style-option-check {
  position: absolute;
  top: 2px;
  right: 2px;
  background: white;
  border-radius: 50%;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
}

.map-style-option-label {
  font-size: 11px;
  font-weight: 500;
  color: #374151;
  white-space: nowrap;
  transition: color 0.2s ease;
}

.map-style-option:hover .map-style-option-label {
  color: rgb(var(--v-theme-primary));
}

.map-style-option.active .map-style-option-label {
  font-weight: 700;
  color: rgb(var(--v-theme-primary));
}

.map-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 40px 24px;
  height: calc(100vh - 180px);
  min-height: 300px;
  box-sizing: border-box;
  animation: fadeIn 0.3s ease-in-out;
}

.map-empty-icon {
  opacity: 0.4;
  color: rgba(var(--v-theme-on-surface-variant), 0.8);
  margin-bottom: 30px;
}

.map-empty-title {
  font-size: 20px;
  font-weight: 500;
  color: rgba(var(--v-theme-on-surface-variant));
  margin: 0 0 4px 0;
}

.map-empty-description {
  font-size: 14px;
  color: rgba(var(--v-theme-on-surface-variant), 0.7);
  margin: 0 0 24px 0;
  line-height: 1.5;
  max-width: 280px;
}

.map-empty-button {
  text-transform: none;
  font-weight: 500;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
