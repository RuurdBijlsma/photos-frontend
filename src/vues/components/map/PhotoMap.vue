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
    center?: { lon: number; lat: number }
    zoom?: number
  }>(),
  {
    center: () => ({ lon: 5.2913, lat: 52.1326 }),
    zoom: 8,
  },
)

const emit = defineEmits<{
  (e: 'update:viewport-items', items: SimpleTimelineItem[]): void
  (e: 'select:photo', id: string): void
  (e: 'select:cluster', payload: { key: string; items: SimpleTimelineItem[] }): void
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

function setMarkerThumbnail(container: HTMLElement, item: SimpleTimelineItem, size: number) {
  container.replaceChildren()
  const img = document.createElement('img')
  img.className = 'marker-thumb-img'
  img.alt = ''
  img.draggable = false
  img.src = mediaItemService.getPhotoThumbnail(item.id, getThumbnailHeight(size), !item.hasThumbnails)
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
      (typeof key === 'string' && props.selectedPhotoId === key) ||
      props.selectedClusterKey === key
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
    center: props.center,
    zoom: props.zoom,
    attributionControl: {
      compact: true,
    },
  })

  map.value.on('load', () => {
    updateClusters()
    fitMapToItems()
  })

  map.value.on('move', updatePreviewPosition)
  map.value.on('moveend', () => {
    updateVisibleMarkers()
    emitViewportItems()
  })
  map.value.on('zoomend', () => {
    updateVisibleMarkers()
    emitViewportItems()
  })
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
    fitMapToItems()
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

function fitMapToItems() {
  if (!map.value || props.items.length === 0) return

  const coords = props.items
    .filter((item) => item.latitude !== 0 || item.longitude !== 0)
    .map((item) => [item.longitude, item.latitude] as [number, number])

  if (coords.length === 0) return

  if (coords.length === 1) {
    map.value.flyTo({ center: coords[0], zoom: 14, essential: true, duration: 500 })
    return
  }

  const bounds = coords.reduce(
    (b, coord) => b.extend(coord),
    new maplibregl.LngLatBounds(coords[0], coords[0]),
  )

  map.value.fitBounds(bounds, { padding: 60, maxZoom: 14, duration: 0 })
}

function updateClusters() {
  if (!props.items) return

  const superclusterIndex = new Supercluster({
    radius: 50,
    maxZoom: 16,
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
  const zoom = Math.min(16, Math.floor(map.value.getZoom()))

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
        clearPreview()
        const items = getClusterItems(clusterId)
        emit('select:cluster', { key: key as string, items })
      })
    } else {
      const photoItem = cluster.properties.item as SimpleTimelineItem | undefined
      if (photoItem) {
        setMarkerThumbnail(thumbWrap, photoItem, 150)
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
        v-if="previewItem && selectedPhotoId === previewItem.id"
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

.map-marker-anchor.is-photo {
  width: 48px;
  height: 48px;
}

.map-marker-anchor.is-cluster {
  width: 56px;
  height: 56px;
}

.map-marker-inner {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 3px solid white;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.35);
  position: relative;
  overflow: visible;
  transition:
    transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275),
    border-color 0.2s;
}

.marker-thumb-wrap {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  overflow: hidden;
}

.marker-thumb-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  pointer-events: none;
}

.photo-marker:hover,
.photo-marker.highlighted {
  transform: scale(1.2);
  border-color: rgb(var(--v-theme-primary));
}

.photo-marker.selected,
.cluster-marker.selected {
  transform: scale(1.2);
  border-color: rgb(var(--v-theme-primary));
  border-width: 4px;
}

.cluster-marker:hover {
  transform: scale(1.1);
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
