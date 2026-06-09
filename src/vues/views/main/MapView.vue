<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref, useTemplateRef, watch } from 'vue'
import maplibregl, { type Map as LibreMap, type MapOptions } from 'maplibre-gl'
import BaseMap, { type StyleName } from '@/vues/components/map/BaseMap.vue'
import MainLayoutContainer from '@/vues/components/MainLayoutContainer.vue'
import mediaItemService from '@/scripts/services/mediaItemService.ts'
import {
  useEventListener,
  useResizeObserver,
  useStorage,
  useDebounceFn,
  useThrottleFn,
} from '@vueuse/core'
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

  // Heatmap Intensity: Controls global density multiplier by zoom level.
  // We keep it low when zoomed out to prevent instant saturation, and
  // ramp it up as points separate to keep details visible.
  intensity: [
    [0, 0.15], // Global view (very low multiplier to prevent massive solid blocks)
    [6, 0.25], // Europe scale (excellent range for stretching teal and green)
    [11, .7], // Regional scale (starts scaling up as clusters separate)
    [15, 1], // High local intensity to make sparse spots stand out
  ] as [number, number][],

  // Heatmap Radius: Blending circle radius in pixels by zoom level.
  // A progressive curve allows distant cities to bridge together into connected corridors.
  radius: [
    [0, 8], // Tight at world level to prevent oceans from flooding with color
    [6, 13], // Expanded at Europe level to form beautiful organic channels
    [11, 20], // Generous blending of regional structures
    [16, 30], // Large smooth diffusion before fading out
  ] as [number, number][],

  // Heatmap Opacity: Gradual crossover transition to point markers
  opacity: [
    [12, 1],
    [16, 0],
  ] as [number, number][],

  // Color Stops: [density, color_string] mapping directly to your second screenshot.
  // We raise the color opacities slightly so they are vibrant, but keep the gradient wide.
  colorStops: [
    [0, 'rgba(124, 77, 255, 0)'], // Ground state (invisible boundary)
    [0.0001, 'rgba(115, 50, 160, .2)'], // Soft violet outer haze
    [0.10, 'rgb(103 83 232 / 0.7)'], // Soft violet outer haze
    [0.35, 'rgba(0, 180, 210, 0.7)'], // Broad, cool cyan/teal transition layer
    [0.6, 'rgba(135, 195, 60, 0.7)'], // Warm lime-green core framing
    [0.9, 'rgba(235, 172, 45, 0.7)'], // Warm yellow-orange transition
    [1, 'rgb(213 87 102 / 0.7)'], // Magenta/deep-red core reserved only for major peaks
  ] as [number, string][],

  // Visual options for individual markers at high zoom levels
  point: {
    color: 'rgb(165, 30, 115)',
    strokeColor: '#ffffff',
    strokeWidth: 1.5,
    radius: [
      [13, 5],
      [17, 10],
    ] as [number, number][],
    opacity: [
      [13, 0],
      [16, 1],
    ] as [number, number][],
  },
}

const route = useRoute()
let initialized = false
const mapPhotos = ref<MapPhotosResponse | null>(null)
let map: null | maplibregl.Map = null

const currentVisibleIds = new Set<string>()

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

  if (!loadedMap.getSource('photos')) {
    addPhotoSource(loadedMap, mapPhotos.value)
    addMapLayers(loadedMap)
  }
}

const loadCoord = computed(() => {
  const lat = Number(route.query.lat)
  const lon = Number(route.query.lon)
  if (!lat || !lon) return null
  return { lat: lat, lng: lon }
})

const DEFAULT_MAP_OPTIONS = {
  center: { lat: 40, lng: 0 },
  zoom: 3,
  attributionControl: {
    compact: true,
  },
} satisfies MapOptionsWithoutContainer

const timelineItems = computed(() => {
  const items = visibleItems.value

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

function getInitialMapOptions(photos: MapPhotosResponse): MapOptionsWithoutContainer {
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

function getLngLat(item: MapPhotoItem): [number, number] {
  return [item.longitude, item.latitude]
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
    addMapLayers(loadedMap)
  }

  const updateVisibleItems = () => syncVisibleItems(loadedMap)
  const debouncedUpdate = useDebounceFn(updateVisibleItems, 80)

  loadedMap.on('zoomend', debouncedUpdate)
  loadedMap.on('moveend', debouncedUpdate)
  loadedMap.on(
    'data',
    (e: maplibregl.MapDataEvent & { sourceId?: string; isSourceLoaded?: boolean }) => {
      if (e.sourceId === 'photos' && e.isSourceLoaded) debouncedUpdate()
    },
  )

  updateVisibleItems()
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

function addPhotoSource(loadedMap: LibreMap, photos: MapPhotosResponse) {
  loadedMap.addSource('photos', {
    type: 'geojson',
    data: createPhotosGeoJson(photos),
  })
}

function addMapLayers(loadedMap: LibreMap) {
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

function syncVisibleItems(loadedMap: LibreMap) {
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
        if (map) syncVisibleItems(map)
      }, 75)
    }
  }
})

onUnmounted(() => {
  // Cleanup references if any
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
          :theme="currentStyle === 'DARK_COLORFUL' ? 'dark' : 'light'"
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
          <div class="photo-count-header">
            <h2>In View</h2>
            <span class="photo-count">{{ timelineItems.length.toLocaleString() }}</span>
          </div>
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
