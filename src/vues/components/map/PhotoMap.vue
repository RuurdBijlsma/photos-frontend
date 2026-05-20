<script setup lang="ts">
import { ref, onMounted, onUnmounted, shallowRef, watch } from 'vue'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import Supercluster from 'supercluster'
import type { MapPhotoItem, SimpleTimelineItem } from '@/scripts/types/generated/timeline.ts'
import mediaItemService from '@/scripts/services/mediaItemService.ts'

const props = withDefaults(
  defineProps<{
    items: MapPhotoItem[]
    activePhotoId: string | null
    center?: { lon: number; lat: number }
    zoom?: number
  }>(),
  {
    center: () => ({ lon: 5.2913, lat: 52.1326 }), // Netherlands center
    zoom: 8,
  },
)

const emit = defineEmits<{
  (e: 'update:viewport-items', items: SimpleTimelineItem[]): void
  (e: 'click:photo', id: string): void
  (e: 'hover:photo', id: string | null): void
}>()

const mapContainer = ref<HTMLElement | null>(null)
const map = shallowRef<null | maplibregl.Map>(null)

// Supercluster index instance
const index = shallowRef<Supercluster | null>(null)

// Track active markers currently mounted on the map (key: string for point, number/string for cluster)
const activeMarkers = new Map<string | number, maplibregl.Marker>()

// Keep track of which element is currently highlighted
let highlightedElement: HTMLElement | null = null

// Initialize Map
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
  })

  // Watch for movement
  map.value.on('move', updateVisibleMarkers)
  map.value.on('moveend', emitViewportItems)
})

onUnmounted(() => {
  // Clean up markers
  for (const marker of activeMarkers.values()) {
    marker.remove()
  }
  activeMarkers.clear()

  if (map.value) {
    map.value.remove()
  }
})

// Build cluster index
watch(
  () => props.items,
  () => {
    updateClusters()
  },
  { deep: false },
)

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

// Dynamically create/remove markers depending on bounds
function updateVisibleMarkers() {
  if (!map.value || !index.value) return

  const bounds = map.value.getBounds()
  const bbox: [number, number, number, number] = [
    bounds.getWest(),
    bounds.getSouth(),
    bounds.getEast(),
    bounds.getNorth(),
  ]
  const zoom = Math.floor(map.value.getZoom())

  // Get clusters/features in viewport
  const clusters = index.value.getClusters(bbox, zoom)

  // Track coordinates/IDs we are displaying in this frame
  const displayedKeys = new Set<string | number>()

  for (const cluster of clusters) {
    const coords = cluster.geometry.coordinates as [number, number]
    const isCluster = cluster.properties.cluster
    const key = isCluster ? `c_${cluster.id}` : (cluster.properties.id as string)

    displayedKeys.add(key)

    if (activeMarkers.has(key)) {
      // Marker already exists on map; just ensure its position hasn't changed (supercluster positions can shift slightly)
      // Usually positions are static in a frame, but let's double check
      continue
    }

    // Create marker DOM element
    const el = document.createElement('div')
    el.className = 'map-marker'

    if (isCluster) {
      el.classList.add('cluster-marker')

      // Fetch leaves to show the thumbnail of the first photo in the cluster
      const leaves = index.value.getLeaves(cluster.properties.cluster_id, 1)
      const leafItem = leaves[0]?.properties.item as SimpleTimelineItem | undefined
      if (leafItem) {
        const thumbUrl = mediaItemService.getPhotoThumbnail(
          leafItem.id,
          150,
          !leafItem.hasThumbnails,
        )
        el.style.backgroundImage = `url(${thumbUrl})`
      }

      // Add badge for counts
      const badge = document.createElement('span')
      badge.className = 'cluster-badge'
      const count = cluster.properties.point_count
      badge.innerText = `+${count >= 1000 ? Math.round(count / 1000) + 'k' : count}`
      el.appendChild(badge)

      // Clicking zooms in on cluster
      el.addEventListener('click', (e) => {
        e.stopPropagation()
        if (!map.value || !index.value || !cluster.properties.cluster_id) return
        const expansionZoom = index.value.getClusterExpansionZoom(cluster.properties.cluster_id)
        map.value.flyTo({
          center: coords,
          zoom: Math.min(expansionZoom + 1, 18),
          essential: true,
        })
      })
    } else {
      el.classList.add('photo-marker')
      el.setAttribute('data-id', key as string)

      const photoItem = cluster.properties.item as SimpleTimelineItem | undefined
      if (photoItem) {
        const thumbUrl = mediaItemService.getPhotoThumbnail(
          photoItem.id,
          150,
          !photoItem.hasThumbnails,
        )
        el.style.backgroundImage = `url(${thumbUrl})`
      }

      // Hover handling
      el.addEventListener('mouseenter', () => {
        emit('hover:photo', key as string)
      })
      el.addEventListener('mouseleave', () => {
        emit('hover:photo', null)
      })

      // Click handling
      el.addEventListener('click', (e) => {
        e.stopPropagation()
        emit('click:photo', key as string)
      })
    }

    // Mount to map
    const marker = new maplibregl.Marker({ element: el })
      .setLngLat(coords)
      .addTo(map.value)

    activeMarkers.set(key, marker)
  }

  // Remove markers that are no longer in viewport
  for (const [key, marker] of activeMarkers.entries()) {
    if (!displayedKeys.has(key)) {
      marker.remove()
      activeMarkers.delete(key)
    }
  }

  // Sync highlighting of activePhotoId
  syncActiveHighlight()
}

// Fetch all photos inside the viewport to update the sidebar grid
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

  // Filter items in viewport
  const visible = props.items
    .filter((item) => {
      const lon = item.longitude
      const lat = item.latitude
      if (lon === 0 && lat === 0) return false

      // Handle longitudinal boundary wrapping (anti-meridian cross)
      if (w > e) {
        return (lon >= w || lon <= e) && lat >= s && lat <= n
      }
      return lon >= w && lon <= e && lat >= s && lat <= n
    })
    .map((item) => item.item)
    .filter((x): x is SimpleTimelineItem => !!x)

  emit('update:viewport-items', visible)
}

// Watch for hover changes from sidebar
watch(
  () => props.activePhotoId,
  () => {
    syncActiveHighlight()
  },
)

function syncActiveHighlight() {
  // Remove current highlight
  if (highlightedElement) {
    highlightedElement.classList.remove('highlighted')
    highlightedElement = null
  }

  if (props.activePhotoId) {
    const marker = activeMarkers.get(props.activePhotoId)
    if (marker) {
      const el = marker.getElement()
      el.classList.add('highlighted')
      highlightedElement = el
    }
  }
}
</script>

<template>
  <div ref="mapContainer" class="photo-map-wrapper"></div>
</template>

<style>
/* Global styles for MapLibre custom elements to function properly inside parent scope */
.photo-map-wrapper {
  width: 100%;
  height: 100%;
}

.map-marker {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: 3px solid white;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.35);
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  cursor: pointer;
  transition:
    transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275),
    border-color 0.2s;
  will-change: transform;
}

.photo-marker:hover,
.photo-marker.highlighted {
  transform: scale(1.3);
  border-color: rgb(var(--v-theme-primary));
  z-index: 999;
}

.cluster-marker {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: 3px solid white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  position: relative;
  transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.cluster-marker:hover {
  transform: scale(1.15);
  z-index: 999;
}

.cluster-badge {
  position: absolute;
  bottom: -6px;
  right: -6px;
  background: rgb(var(--v-theme-primary));
  color: white;
  border-radius: 12px;
  padding: 2px 6px;
  font-size: 11px;
  font-weight: bold;
  border: 2px solid white;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
  pointer-events: none;
}
</style>
