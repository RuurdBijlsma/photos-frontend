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
import { useRoute, useRouter } from 'vue-router'
import MapDateFilter from '@/vues/components/map/MapDateFilter.vue'

// Tweakable visual configuration for the map representation
const HEATMAP_CONFIG = {
  // The zoom level where point circles begin to show up
  pointMinZoom: 13,
  heatmapMaxZoom: 16,

  // Heatmap Intensity: global density multiplier by zoom.
  // Kept low when zoomed out to show structure, ramped up as points separate.
  intensity: [
    [0, 0.2], // World view – gentle presence
    [5, 0.35], // Continent scale
    [10, 0.7], // Regional clusters become distinct
    [14, 1.0], // Local peaks stand out clearly
  ],

  // Heatmap Radius: blending radius in pixels per zoom.
  // A smooth decay that prevents oceans from flooding while keeping cities connected.
  radius: [
    [0, 12], // Tight at global level to avoid ocean smearing
    [5, 18], // Merges distant points into corridors
    [10, 30], // Natural separation of neighbourhoods
    [16, 25], // Crisp individual hotspots before fading
  ],

  // Heatmap Opacity: seamless crossover from heatmap to point markers.
  opacity: [
    [12, 0.75],
    [16, 0],
  ],

  // Color Stops: classic thermal gradient (transparent → cold → hot → peak white).
  // Uses solid colours so that layer blending is controlled only by heatmap-opacity.
  colorStops: [
    [0, 'rgba(0, 0, 0, 0)'], // fully invisible boundary
    [0.05, 'rgb(76 70 184 / 0.7)'], // deep indigo for lowest density
    [0.2, 'rgba(0, 140, 200, 0.7)'], // rich cyan/blue
    [0.4, 'rgba(40, 200, 100, 0.7)'], // vivid green
    [0.6, 'rgba(240, 220, 40, 0.7)'], // warm yellow
    [0.8, 'rgb(214 116 49 / 0.7)'], // intense orange
    [1, 'rgb(213 75 75 / 0.7)'], // bright near-white for extreme peaks
  ],

  // Point markers – subtle circles at high zoom to show exact location.
  point: {
    color: 'rgb(80, 30, 120)', // deep purple, visible on most maps
    strokeColor: '#ffffff',
    strokeWidth: 1.8,
    radius: [
      [13, 4],
      [17, 11],
    ],
    opacity: [
      [13, 0],
      [15.5, 0.8],
      [16, 1],
    ],
  },
}

const route = useRoute()
const router = useRouter()

// --- State & Storage ---
const mapMode = useStorage<'markers' | 'heatmap'>('mapViewMode', 'markers')
const mapPhotos = ref<MapPhotosResponse | null>(null)
let map: null | maplibregl.Map = null
let initialized = false
let updateRun = 0

const photoIdToOrder = new Map<string, number>()
const markers: Record<string, maplibregl.Marker> = {}
const clusterPreviewCache = new Map<number, SimpleTimelineItem>()
let popupMarker: maplibregl.Marker | null = null

// Viewport selection state
const currentVisibleIds = new Set<string>()
const visibleItems = ref<SimpleTimelineItem[]>([])
const selectedClusterItems = ref<SimpleTimelineItem[] | null>(null)
const selectedMarkerKey = ref<string | null>(null)
const selectedPopupItem = ref<SimpleTimelineItem | null>(null)
const selectedLngLat = ref<[number, number] | null>(null)

const dateFilter = ref({
  startDate: null as Date | null,
  endDate: null as Date | null,
  active: false,
  startGranularity: 'month' as 'month' | 'day',
  endGranularity: 'month' as 'month' | 'day',
})

// --- Layout & Resize Settings ---
const outerLayoutEl = useTemplateRef('outerLayout')
const MIN_MAP_WIDTH = 400
const MIN_SIDEBAR_WIDTH = 200
const SIDEBAR_GAP = 5
const CLOSE_DRAG_THRESHOLD = 50

const sidebarOpen = useStorage('mapSidebarOpen', true)
const sidebarWidth = useStorage('mapSidebarWidth', window.innerWidth / 3)
const isResizingSidebar = ref(false)

const mapOptions = ref<Omit<MapOptions, 'container' | 'style'> | null>(null)
const currentStyle = useStorage<StyleName>('mapStyle', 'LIBERTY')
const isStyleSelectorHovered = ref(false)

const MAP_STYLES = [
  { key: 'LIBERTY', label: 'Light Map', thumb: 'img/map-thumb/LIBERTY.png' },
  { key: 'SATELLITE', label: 'Satellite', thumb: 'img/map-thumb/SATELLITE.png' },
  { key: 'TERRAIN', label: 'Terrain', thumb: 'img/map-thumb/TERRAIN.png' },
  { key: 'WATERCOLOR', label: 'Watercolor', thumb: 'img/map-thumb/WATERCOLOR.png' },
  { key: 'DARK_COLORFUL', label: 'Dark Map', thumb: 'img/map-thumb/DARK_COLORFUL.png' },
] as const

const DEFAULT_MAP_OPTIONS = {
  center: { lat: 40, lng: 0 },
  zoom: 3,
  attributionControl: { compact: true },
}

// --- Computed Properties ---
const nextStyle = computed(() => {
  const currentIndex = MAP_STYLES.findIndex((s) => s.key === currentStyle.value)
  const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % MAP_STYLES.length
  return MAP_STYLES[nextIndex]
})

function cycleStyle() {
  currentStyle.value = nextStyle.value.key
}

const loadCoord = computed(() => {
  const lat = Number(route.query.lat)
  const lon = Number(route.query.lon)
  if (!lat || !lon) return null
  return { lat, lng: lon }
})

const photoItems = computed(() => {
  return mapPhotos.value?.items.map((p) => p.item).filter((p) => !!p) ?? []
})

const timelineItems = computed(() => {
  const items = selectedClusterItems.value ?? visibleItems.value
  return items.slice().sort((a, b) => {
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

// --- Fetch Data ---
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

// --- Map Lifecycle & Source Configuration ---
function handleMapLoad(loadedMap: LibreMap) {
  map = loadedMap
  initializeMap()
}

function handleStyleLoad(loadedMap: LibreMap) {
  if (mapPhotos.value === null) return
  rebuildMapResources(loadedMap)
}

mediaItemService.listMapPhotos().then((loadedPhotos) => {
  loadedPhotos.items.forEach((p, index) => {
    if (p.item?.id) {
      photoIdToOrder.set(p.item.id, index)
    }
  })
  mapPhotos.value = loadedPhotos
  mapOptions.value = getInitialMapOptions(loadedPhotos)
  initializeMap()
})

function initializeMap() {
  if (map === null || mapPhotos.value === null || initialized) return
  initialized = true

  map.addControl(
    new maplibregl.NavigationControl({
      showCompass: true,
      showZoom: true,
      visualizePitch: true,
    }),
    'bottom-right',
  )

  rebuildMapResources(map)

  const updateViewportData = () => {
    if (!map) return
    if (mapMode.value === 'markers') {
      syncVisibleMarkers(map)
    } else {
      syncVisibleHeatmapItems(map)
    }
  }
  const throttledUpdate = useThrottleFn(updateViewportData, 50)

  map.on('zoomend', throttledUpdate)
  map.on('move', throttledUpdate)
  map.on('moveend', throttledUpdate)
  map.on('data', (e: maplibregl.MapDataEvent & { sourceId?: string; isSourceLoaded?: boolean }) => {
    if (e.sourceId === 'photos' && e.isSourceLoaded) throttledUpdate()
  })
  map.on('click', () => {
    if (mapMode.value === 'markers') clearMarkerSelection()
  })

  updateViewportData()
}

/**
 * Rebuilds map sources and layers from scratch based on the visualization mode
 */
function rebuildMapResources(loadedMap: LibreMap) {
  // 1. Clear active selections and UI helpers
  clearMarkerSelection()
  removeAllMarkers()

  // 2. Clear pre-existing layers safely
  const layersToRemove = [
    'photos-heat',
    'photos-point',
    'photos-helper',
    'cluster-helper',
    'unclustered-point-helper',
  ]
  layersToRemove.forEach((layerId) => {
    if (loadedMap.getLayer(layerId)) loadedMap.removeLayer(layerId)
  })

  // 3. Rebuild sources (dynamic configuration for clusters vs heatmap)
  if (loadedMap.getSource('photos')) {
    loadedMap.removeSource('photos')
  }

  if (mapPhotos.value) {
    loadedMap.addSource('photos', {
      type: 'geojson',
      data: createPhotosGeoJson(mapPhotos.value),
      ...(mapMode.value === 'markers'
        ? {
            cluster: true,
            clusterMaxZoom: 17,
            clusterRadius: 48,
          }
        : {}),
    })
  }

  // 4. Attach appropriate configuration layers
  if (mapMode.value === 'markers') {
    addMarkerLayers(loadedMap)
    syncVisibleMarkers(loadedMap)
  } else {
    addHeatmapLayers(loadedMap)
    syncVisibleHeatmapItems(loadedMap)
  }
}

function createPhotosGeoJson(photos: MapPhotosResponse): GeoJSON.FeatureCollection<GeoJSON.Point> {
  return {
    type: 'FeatureCollection',
    features: photos.items.map((p) => ({
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

// --- Heatmap Setup & Syncer ---
function addHeatmapLayers(loadedMap: LibreMap) {
  // Heatmap Layer using configured intensity, color bands, and radius curves
  loadedMap.addLayer({
    id: 'photos-heat',
    type: 'heatmap',
    source: 'photos',
    maxzoom: HEATMAP_CONFIG.heatmapMaxZoom,
    paint: {
      'heatmap-intensity': [
        'interpolate',
        ['linear'],
        ['zoom'],
        ...HEATMAP_CONFIG.intensity.flat(),
      ],
      'heatmap-color': [
        'interpolate',
        ['linear'],
        ['heatmap-density'],
        ...HEATMAP_CONFIG.colorStops.flat(),
      ],
      'heatmap-radius': ['interpolate', ['linear'], ['zoom'], ...HEATMAP_CONFIG.radius.flat()],
      'heatmap-opacity': ['interpolate', ['linear'], ['zoom'], ...HEATMAP_CONFIG.opacity.flat()],
    },
  })

  // Exact point marker circles mapping to the zoom configuration
  loadedMap.addLayer({
    id: 'photos-point',
    type: 'circle',
    source: 'photos',
    minzoom: HEATMAP_CONFIG.pointMinZoom,
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], ...HEATMAP_CONFIG.point.radius.flat()],
      'circle-color': HEATMAP_CONFIG.point.color,
      'circle-stroke-color': HEATMAP_CONFIG.point.strokeColor,
      'circle-stroke-width': HEATMAP_CONFIG.point.strokeWidth,
      'circle-opacity': [
        'interpolate',
        ['linear'],
        ['zoom'],
        ...HEATMAP_CONFIG.point.opacity.flat(),
      ],
    },
  })

  // Invisible layer used solely to query visible items in the viewport
  loadedMap.addLayer({
    id: 'photos-helper',
    type: 'circle',
    source: 'photos',
    paint: {
      'circle-radius': 10,
      'circle-opacity': 0,
    },
  })
}

function syncVisibleHeatmapItems(loadedMap: LibreMap) {
  if (!loadedMap.getLayer('photos-helper')) return

  const helperFeatures = loadedMap.queryRenderedFeatures({ layers: ['photos-helper'] })
  if (helperFeatures.length === 0 && visibleItems.value.length === 0) {
    return
  }

  const newItems: SimpleTimelineItem[] = []
  const newIds = new Set<string>()

  for (const feature of helperFeatures) {
    const id = feature.properties?.id
    if (id && !newIds.has(id)) {
      const item = getItemFromProperties(feature.properties)
      if (item) {
        newIds.add(id)
        newItems.push(item)
      }
    }
  }

  let hasChanged = newIds.size !== currentVisibleIds.size
  if (!hasChanged) {
    for (const id of newIds) {
      if (!currentVisibleIds.has(id)) {
        hasChanged = true
        break
      }
    }
  }

  if (hasChanged) {
    currentVisibleIds.clear()
    newIds.forEach((id) => currentVisibleIds.add(id))
    visibleItems.value = newItems
  }
}

// --- Markers & Clusters Setup & Syncer ---
function addMarkerLayers(loadedMap: LibreMap) {
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
      'circle-opacity': 0,
    },
  })
}

async function syncVisibleMarkers(loadedMap: LibreMap) {
  const run = ++updateRun
  const source = loadedMap.getSource('photos') as maplibregl.GeoJSONSource
  if (!source) return

  const clusterFeatures = loadedMap.queryRenderedFeatures({ layers: ['cluster-helper'] })
  const pointFeatures = loadedMap.queryRenderedFeatures({ layers: ['unclustered-point-helper'] })
  const newMarkers: Record<string, maplibregl.Marker> = {}
  const visibleItemMap = new Map<string, SimpleTimelineItem>()

  let clusterResults: Array<{
    clusterId: number
    count: number
    coords: [number, number]
    leaves: GeoJSON.Feature[]
  }> = []

  try {
    const promises = clusterFeatures.map(async (feature) => {
      const clusterId = Number(feature.properties.cluster_id)
      const count = Number(feature.properties.point_count)
      const coords = getFeatureCoordinates(feature)
      const leaves = await source.getClusterLeaves(clusterId, count, 0)
      return { clusterId, count, coords, leaves }
    })

    clusterResults = await Promise.all(promises)
  } catch {
    return // Source changed mid-query, abort execution
  }

  if (run !== updateRun) return

  // 1. Process clusters
  for (const res of clusterResults) {
    const { clusterId, count, coords, leaves } = res
    const previewItem = getClusterPreviewItem(clusterId, leaves)
    if (!previewItem) continue

    leaves
      .map((leaf) => getItemFromProperties(leaf.properties))
      .filter((item): item is SimpleTimelineItem => !!item)
      .forEach((item) => visibleItemMap.set(item.id, item))

    addOrUpdateClusterMarker(loadedMap, clusterId, previewItem, count, coords, newMarkers)
  }

  // 2. Process exact points
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

function getClusterPreviewItem(clusterId: number, leaves: GeoJSON.Feature[]) {
  if (!clusterPreviewCache.has(clusterId)) {
    let firstProps = leaves[0]?.properties
    for (const leaf of leaves) {
      const props = leaf.properties
      if (!props) continue
      if (!firstProps || props.id > firstProps.id) {
        firstProps = props
      }
    }
    const previewItem = getItemFromProperties(firstProps ?? undefined)
    if (!previewItem) return null
    clusterPreviewCache.set(clusterId, previewItem)
  }
  return clusterPreviewCache.get(clusterId)!
}

// --- Marker DOM Creation & Lifecycle ---
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

function removeAllMarkers() {
  Object.values(markers).forEach((m) => m.remove())
  for (const key in markers) {
    delete markers[key]
  }
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

const updateClusterMarkerElement = (el: HTMLElement, count: number) => {
  const badge = el.querySelector<HTMLElement>('.map-cluster-count')
  if (badge) badge.textContent = String(count)
}

// --- Marker Interactions & Popups ---
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

  try {
    const leaves = await source.getClusterLeaves(clusterId, Number.isFinite(count) ? count : 100, 0)
    selectedClusterItems.value = leaves
      .map((leaf) => getItemFromProperties(leaf.properties))
      .filter((item): item is SimpleTimelineItem => !!item)
    selectedPopupItem.value = getClusterPreviewItem(clusterId, leaves)
    if (selectedPopupItem.value && selectedLngLat.value) {
      showPopup(selectedPopupItem.value, selectedLngLat.value)
    }
  } catch (err) {
    console.warn('Failed to retrieve cluster leaves:', err)
  }
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
  popupEl.className = 'map-media-popup'

  const closeButton = document.createElement('button')
  let mediaEl: HTMLImageElement | HTMLVideoElement

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
    router.push({ path: `/map/view/${item.id}`, query: route.query })
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

function closePopup() {
  popupMarker?.remove()
  popupMarker = null
}

// --- Utilities ---
function getLngLat(item: MapPhotoItem): [number, number] {
  return [item.longitude, item.latitude]
}

function getFeatureCoordinates(feature: maplibregl.MapGeoJSONFeature): [number, number] {
  return (feature.geometry as GeoJSON.Point).coordinates as [number, number]
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

function zoomToFitAll() {
  if (!map || !mapPhotos.value) return
  const locations = mapPhotos.value.items
  if (locations.length === 0) return

  if (locations.length === 1) {
    const [location] = locations
    map.flyTo({
      center: getLngLat(location!),
      zoom: 11,
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
    duration: 1200,
  })
}

function getInitialMapOptions(photos: MapPhotosResponse): Omit<MapOptions, 'container' | 'style'> {
  if (loadCoord.value) {
    return {
      ...DEFAULT_MAP_OPTIONS,
      center: loadCoord.value,
      zoom: 16,
    }
  }
  const locations = photos.items
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

// --- Layout Sizing Controls ---
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

// --- Watchers & Cleanups ---
watch(mapMode, () => {
  if (map && initialized) {
    rebuildMapResources(map)
  }
})

watch(loadCoord, (newVal, oldVal) => {
  if (!map || !loadCoord.value) return
  if (JSON.stringify(newVal) === JSON.stringify(oldVal)) return
  map.flyTo({
    center: loadCoord.value,
    zoom: 17,
  })
})

watch(sidebarOpen, requestMapResize)

watch(mapPhotos, (newPhotos) => {
  if (map && newPhotos) {
    const source = map.getSource('photos') as maplibregl.GeoJSONSource | undefined
    if (source) {
      source.setData(createPhotosGeoJson(newPhotos))
      map.triggerRepaint()
      setTimeout(() => {
        if (map) {
          if (mapMode.value === 'markers') {
            syncVisibleMarkers(map)
          } else {
            syncVisibleHeatmapItems(map)
          }
        }
      }, 75)
    }
  }
})

onUnmounted(() => {
  removeAllMarkers()
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
          v-if="mapOptions"
          :map-style="currentStyle"
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
          :theme="currentStyle === 'DARK_COLORFUL' ? 'dark' : 'light'"
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
              v-show="isStyleSelectorHovered"
              flat
              class="map-style-options-card"
              rounded="xl"
            >
              <!-- Visualization View Selector -->
              <div class="map-mode-selector">
                <span class="map-mode-title">Layer Mode</span>
                <v-chip-group v-model="mapMode" color="primary" mandatory column>
                  <v-chip
                    prepend-icon="mdi-map-marker-multiple-outline"
                    value="markers"
                    key="markers"
                    variant="flat"
                  >
                    Markers
                  </v-chip>
                  <v-chip prepend-icon="mdi-fire" value="heatmap" key="heatmap" variant="flat">
                    Heatmap
                  </v-chip>
                </v-chip-group>
              </div>

              <v-divider class="my-3 opacity-20" />

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
          v-tooltip="{ location: 'left', text: 'Open sidebar' }"
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
      v-if="mapPhotos"
      hide-drop-shadow
      class="timeline"
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
          v-tooltip="{ location: 'top', text: 'Close sidebar' }"
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
/* --- Outer Layout Framework --- */
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

/* --- Timeline Sidebar Elements --- */
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

/* --- Map Wrapper & Controls --- */
.map-wrapper {
  width: 100%;
  height: 100%;
  position: relative;
}

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

/* --- Custom Map Markers & Cluster Visuals --- */
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

/* --- Map Media Popup --- */
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

/* --- Style & Visualization Switcher UI --- */
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
  padding: 16px 15px;
  background-color: rgba(var(--v-theme-background), 0.75);
  backdrop-filter: saturate(250%) blur(12px) !important;
  border: 1px solid rgba(var(--v-theme-primary), 0.2);
  width: max-content;
}

.map-style-options-card::after {
  content: '';
  position: absolute;
  bottom: -16px;
  left: 0;
  right: 0;
  height: 16px;
  background: transparent;
}

/* --- Visualization Toggle Styles --- */
.map-mode-selector {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.map-mode-title {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.5px;
  color: rgba(var(--v-theme-on-surface-variant), 0.7);
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

/* --- Empty Search State --- */
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
