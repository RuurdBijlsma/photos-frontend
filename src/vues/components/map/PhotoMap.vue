<script setup lang="ts">
import { ref, onMounted, onUnmounted, shallowRef, watch } from 'vue'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import Supercluster from 'supercluster'
import type { MapPhotoItem, SimpleTimelineItem } from '@/scripts/types/generated/timeline.ts'
import mediaItemService from '@/scripts/services/mediaItemService.ts'
import MapPhotoPreview from '@/vues/components/map/MapPhotoPreview.vue'
import { getThumbnailHeight } from '@/scripts/utils.ts'

const props = withDefaults(
  defineProps<{
    items: MapPhotoItem[]
    selectedPhotoId: string | null
    selectedClusterKey: string | null
    hoverPhotoId: string | null
    initialCenter: { lon: number; lat: number }
    initialZoom: number
  }>(),
  {
    initialCenter: () => ({ lon: 5.2913, lat: 52.1326 }),
    initialZoom: 8,
  },
)

const emit = defineEmits<{
  (e: 'update:viewport-items', items: SimpleTimelineItem[]): void
  (e: 'select:photo', id: string): void
  (
    e: 'select:cluster',
    payload: { key: string; items: SimpleTimelineItem[]; previewId?: string },
  ): void
  (e: 'deselect'): void
  (e: 'open:photo', id: string): void
  (e: 'hover:photo', id: string | null): void
}>()

const mapContainer = ref<HTMLElement | null>(null)
const map = shallowRef<null | maplibregl.Map>(null)

const index = shallowRef<Supercluster | null>(null)
const activeMarkers = new Map<string | number, maplibregl.Marker>()

const previewItem = ref<SimpleTimelineItem | null>(null)
const previewCoords = ref<[number, number] | null>(null)
const previewPosition = ref({ left: '0px', top: '0px' })

const MARKER_MAX_EDGE = 55
const MARKER_MIN_EDGE = 35

/** Lower radius = less aggressive clustering; higher maxZoom = individual pins sooner */
const CLUSTER_MAX_ZOOM = 18
const CLUSTER_RADIUS = 22

/** ratio = width / height */
function markerSizeFromRatio(ratio: number): { width: number; height: number } {
  const r = ratio > 0 && Number.isFinite(ratio) ? ratio : 1
  if (r >= 1) {
    const width = MARKER_MAX_EDGE
    const height = Math.round(width / r)
    return { width, height: Math.max(MARKER_MIN_EDGE, height) }
  }
  const height = MARKER_MAX_EDGE
  const width = Math.round(height * r)
  return { width: Math.max(MARKER_MIN_EDGE, width), height }
}

function applyPhotoMarkerSize(anchor: HTMLElement, ratio: number) {
  const { width, height } = markerSizeFromRatio(ratio)
  anchor.style.width = `${width}px`
  anchor.style.height = `${height}px`
}

function setMarkerThumbnail(container: HTMLElement, item: SimpleTimelineItem, size: number) {
  container.replaceChildren()
  const img = document.createElement('img')
  img.className = 'marker-thumb-img'
  img.alt = ''
  img.draggable = false
  img.src = mediaItemService.getPhotoThumbnail(
    item.id,
    getThumbnailHeight(size),
    !item.hasThumbnails,
  )
  container.appendChild(img)
}

function updatePreviewPosition() {
  if (!map.value || !previewCoords.value) return
  const point = map.value.project(previewCoords.value)
  previewPosition.value = {
    left: `${point.x}px`,
    top: `${point.y}px`,
  }
}

function selectPhoto(id: string, coords: [number, number], item: SimpleTimelineItem) {
  previewItem.value = item
  previewCoords.value = coords
  updatePreviewPosition()
  emit('select:photo', id)
}

function clearPreview() {
  previewItem.value = null
  previewCoords.value = null
}

function getClusterItems(clusterId: number): SimpleTimelineItem[] {
  if (!index.value) return []
  const leaves = index.value.getLeaves(clusterId, Infinity)
  return leaves
    .map((leaf) => leaf.properties.item as SimpleTimelineItem | undefined)
    .filter((x): x is SimpleTimelineItem => !!x)
}

function syncSelectionStyles() {
  for (const [key, marker] of activeMarkers.entries()) {
    const inner = marker.getElement().querySelector('.map-marker-inner') as HTMLElement | null
    if (!inner) continue
    const selected =
      (typeof key === 'string' && props.selectedPhotoId === key) || props.selectedClusterKey === key
    inner.classList.toggle('selected', selected)
    inner.classList.toggle(
      'highlighted',
      typeof key === 'string' && props.hoverPhotoId === key && !selected,
    )
  }
}

onMounted(() => {
  if (!mapContainer.value) return

  map.value = new maplibregl.Map({
    container: mapContainer.value,
    style: 'https://tiles.openfreemap.org/styles/liberty',
    center: [props.initialCenter.lon, props.initialCenter.lat],
    zoom: props.initialZoom,
    attributionControl: {
      compact: true,
    },
  })

  map.value.on('load', () => {
    updateClusters()
  })

  let markerRefreshTimer: ReturnType<typeof setTimeout> | null = null
  let lastMarkerZoomFloor = -1

  const flushMarkerRefresh = () => {
    if (markerRefreshTimer !== null) {
      clearTimeout(markerRefreshTimer)
      markerRefreshTimer = null
    }
    updateVisibleMarkers()
  }

  const onMapViewChange = () => {
    updatePreviewPosition()
    emitViewportItems()

    if (!map.value) return
    const zoomFloor = Math.min(CLUSTER_MAX_ZOOM, Math.floor(map.value.getZoom()))
    if (zoomFloor !== lastMarkerZoomFloor) {
      lastMarkerZoomFloor = zoomFloor
      flushMarkerRefresh()
      return
    }

    if (markerRefreshTimer !== null) return
    markerRefreshTimer = setTimeout(() => {
      markerRefreshTimer = null
      updateVisibleMarkers()
    }, 80)
  }

  const onMapViewSettled = () => {
    lastMarkerZoomFloor = -1
    flushMarkerRefresh()
    emitViewportItems()
    updatePreviewPosition()
  }

  map.value.on('move', onMapViewChange)
  map.value.on('zoom', onMapViewChange)
  map.value.on('moveend', onMapViewSettled)
  map.value.on('zoomend', onMapViewSettled)
  map.value.on('click', () => {
    clearPreview()
    emit('deselect')
  })
})

onUnmounted(() => {
  for (const marker of activeMarkers.values()) {
    marker.remove()
  }
  activeMarkers.clear()

  if (map.value) {
    map.value.remove()
  }
})

watch(
  () => props.items,
  () => {
    updateClusters()
  },
  { deep: false },
)

watch(
  () => [props.selectedPhotoId, props.selectedClusterKey, props.hoverPhotoId],
  () => {
    syncSelectionStyles()
    if (!props.selectedPhotoId) {
      clearPreview()
      return
    }

    if (previewItem.value?.id === props.selectedPhotoId) {
      updatePreviewPosition()
      return
    }

    const geo = props.items.find((item) => item.item?.id === props.selectedPhotoId)
    if (geo?.item) {
      previewItem.value = geo.item
      previewCoords.value = [geo.longitude, geo.latitude]
      updatePreviewPosition()
    }
  },
)

function updateClusters() {
  if (!props.items) return

  const superclusterIndex = new Supercluster({
    radius: CLUSTER_RADIUS,
    maxZoom: CLUSTER_MAX_ZOOM,
    minPoints: 2,
  })

  const points = props.items
    .filter((item) => item.latitude !== 0 || item.longitude !== 0)
    .map((item) => ({
      type: 'Feature' as const,
      properties: {
        id: item.item?.id,
        item: item.item,
      },
      geometry: {
        type: 'Point' as const,
        coordinates: [item.longitude, item.latitude],
      },
    }))

  superclusterIndex.load(points)
  index.value = superclusterIndex

  updateVisibleMarkers()
  emitViewportItems()
}

function updateVisibleMarkers() {
  if (!map.value || !index.value) return

  const bounds = map.value.getBounds()
  const bbox: [number, number, number, number] = [
    bounds.getWest(),
    bounds.getSouth(),
    bounds.getEast(),
    bounds.getNorth(),
  ]
  const zoom = Math.min(CLUSTER_MAX_ZOOM, Math.floor(map.value.getZoom()))

  const clusters = index.value.getClusters(bbox, zoom)
  const displayedKeys = new Set<string | number>()

  for (const cluster of clusters) {
    const coords = cluster.geometry.coordinates as [number, number]
    const isCluster = cluster.properties.cluster
    const key = isCluster ? `c_${cluster.id}` : (cluster.properties.id as string)

    displayedKeys.add(key)

    const existing = activeMarkers.get(key)
    if (existing) {
      existing.setLngLat(coords)
      continue
    }

    const anchor = document.createElement('div')
    anchor.className = isCluster ? 'map-marker-anchor is-cluster' : 'map-marker-anchor is-photo'
    if (!isCluster) {
      anchor.setAttribute('data-id', key as string)
    } else {
      anchor.setAttribute('data-cluster-key', key as string)
    }

    const el = document.createElement('div')
    el.className = 'map-marker-inner'
    if (isCluster) {
      el.classList.add('cluster-marker')
    } else {
      el.classList.add('photo-marker')
    }
    anchor.appendChild(el)

    const thumbWrap = document.createElement('div')
    thumbWrap.className = 'marker-thumb-wrap'
    el.appendChild(thumbWrap)

    if (isCluster) {
      const clusterId = cluster.id as number
      const leaves = index.value.getLeaves(clusterId, 1)
      const leafItem = leaves[0]?.properties.item as SimpleTimelineItem | undefined
      if (leafItem) {
        setMarkerThumbnail(thumbWrap, leafItem, 150)
      }

      const badge = document.createElement('span')
      badge.className = 'cluster-badge'
      const count = cluster.properties.point_count
      badge.innerText = `+${count >= 1000 ? Math.round(count / 1000) + 'k' : count}`
      el.appendChild(badge)

      el.addEventListener('click', (e) => {
        e.stopPropagation()
        const items = getClusterItems(clusterId)
        if (leafItem) {
          previewItem.value = leafItem
          previewCoords.value = coords
          updatePreviewPosition()
        } else {
          clearPreview()
        }
        emit('select:cluster', {
          key: key as string,
          items,
          previewId: leafItem?.id,
        })
      })
    } else {
      const photoItem = cluster.properties.item as SimpleTimelineItem | undefined
      if (photoItem) {
        applyPhotoMarkerSize(anchor, photoItem.ratio)
        setMarkerThumbnail(thumbWrap, photoItem, 150)
        if (photoItem.isVideo) {
          el.classList.add('video-marker')
        } else {
          el.classList.add('image-marker')
        }
      } else {
        applyPhotoMarkerSize(anchor, 1)
      }

      el.addEventListener('mouseenter', () => {
        emit('hover:photo', key as string)
      })
      el.addEventListener('mouseleave', () => {
        emit('hover:photo', null)
      })

      el.addEventListener('click', (e) => {
        e.stopPropagation()
        if (!photoItem) return
        selectPhoto(key as string, coords, photoItem)
      })
    }

    const marker = new maplibregl.Marker({ element: anchor, anchor: 'center' })
      .setLngLat(coords)
      .addTo(map.value)

    activeMarkers.set(key, marker)
  }

  for (const [key, marker] of activeMarkers.entries()) {
    if (!displayedKeys.has(key)) {
      marker.remove()
      activeMarkers.delete(key)
    }
  }

  syncSelectionStyles()
}

function emitViewportItems() {
  if (!map.value || !props.items || props.items.length === 0) {
    emit('update:viewport-items', [])
    return
  }

  const bounds = map.value.getBounds()
  const w = bounds.getWest()
  const e = bounds.getEast()
  const s = bounds.getSouth()
  const n = bounds.getNorth()

  const visible = props.items
    .filter((item) => {
      const lon = item.longitude
      const lat = item.latitude
      if (lon === 0 && lat === 0) return false

      if (w > e) {
        return (lon >= w || lon <= e) && lat >= s && lat <= n
      }
      return lon >= w && lon <= e && lat >= s && lat <= n
    })
    .map((item) => item.item)
    .filter((x): x is SimpleTimelineItem => !!x)

  emit('update:viewport-items', visible)
}
</script>

<template>
  <v-theme-provider theme="light" with-background class="photo-map-theme">
    <div class="photo-map-root">
      <div ref="mapContainer" class="photo-map-wrapper"></div>

      <div
        v-if="previewItem && (selectedPhotoId === previewItem.id || selectedClusterKey !== null)"
        class="map-preview-popup"
        :style="previewPosition"
        @click.stop
        @mousedown.stop
      >
        <map-photo-preview :item="previewItem" @open="emit('open:photo', previewItem.id)" />
      </div>
    </div>
  </v-theme-provider>
</template>

<style>
.photo-map-theme {
  width: 100%;
  height: 100%;
}

.photo-map-root {
  position: relative;
  width: 100%;
  height: 100%;
}

.photo-map-wrapper {
  width: 100%;
  height: 100%;
}

/* MapLibre sets transform on this element — no flex/transform/position here */
.map-marker-anchor {
  cursor: pointer;
}

.map-marker-anchor.is-cluster {
  width: 56px;
  height: 56px;
}

.map-marker-inner {
  width: 100%;
  height: 100%;
  border: 2px solid white;
  position: relative;
  overflow: visible;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
  transition:
    transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275),
    border-color 0.2s,
    box-shadow 0.2s;
}

.map-marker-inner.photo-marker {
  border-radius: 5px;
}

.map-marker-inner.photo-marker.image-marker {
}

.map-marker-inner.photo-marker.video-marker {
  border-color: #ff9700;
}

.map-marker-inner.cluster-marker {
  border-radius: 50%;
}

.marker-thumb-wrap {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.photo-marker .marker-thumb-wrap {
  border-radius: 3px;
}

.cluster-marker .marker-thumb-wrap {
  border-radius: 50%;
}

.marker-thumb-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  pointer-events: none;
}

.photo-marker.image-marker:hover,
.photo-marker.image-marker.highlighted,
.photo-marker.image-marker.selected {
  transform: scale(1.2);
  border-color: #42a5f5;
}

.photo-marker.video-marker:hover,
.photo-marker.video-marker.highlighted,
.photo-marker.video-marker.selected {
  transform: scale(1.2);
  border-color: #ffa726;
}

.cluster-marker:hover,
.cluster-marker.selected {
  transform: scale(1.1);
  border-color: #3f51b5;
  border-width: 3px;
}

.cluster-badge {
  position: absolute;
  bottom: -5px;
  right: -5px;
  background: rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-on-primary));
  border-radius: 12px;
  padding: 2px 6px;
  font-size: 11px;
  font-weight: bold;
  border: 2px solid white;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
  pointer-events: none;
  z-index: 1;
  line-height: 1.2;
  white-space: nowrap;
}

.map-preview-popup {
  position: absolute;
  z-index: 5;
  transform: translate(-50%, calc(-100% - 30px));
  pointer-events: auto;
}

/* Invisible bridge from pin to popup for easier clicking */
.map-preview-popup::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: -36px;
  transform: translateX(-50%);
  width: 64px;
  height: 36px;
}
</style>
