<script setup lang="ts">
import { onUnmounted } from 'vue'
import { type Map } from 'maplibre-gl'
import maplibregl from 'maplibre-gl'
import BaseMap from '@/vues/components/map/BaseMap.vue'
import MainLayoutContainer from '@/vues/components/MainLayoutContainer.vue'
import mediaItemService from '@/scripts/services/mediaItemService.ts'
import { getThumbnailHeight } from '@/scripts/utils.ts'
import { useThrottleFn } from '@vueuse/core'

const markers: Record<string, maplibregl.Marker> = {}

const handleMapLoad = async (map: Map) => {
  const mapPhotos = await mediaItemService.listMapPhotos()

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
        },
      })),
    },
    cluster: true,
    clusterMaxZoom: 14,
    clusterRadius: 50,
  })

  // 1. CLUSTER LAYER (WebGL - High Performance)
  map.addLayer({
    id: 'clusters',
    type: 'circle',
    source: 'photos',
    filter: ['has', 'point_count'],
    paint: {
      'circle-color': '#3b82f6',
      'circle-radius': 20,
      'circle-stroke-width': 2,
      'circle-stroke-color': '#ffffff',
    },
  })

  map.addLayer({
    id: 'cluster-count',
    type: 'symbol',
    source: 'photos',
    filter: ['has', 'point_count'],
    layout: {
      'text-field': '{point_count_abbreviated}',
      'text-size': 12,
      'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
    },
    paint: {
      'text-color': '#ffffff',
    },
  })

  // 2. INVISIBLE LAYER FOR PHOTOS
  // This is critical. MapLibre only indexes features for queryRenderedFeatures
  // if they belong to a layer. We make it invisible (opacity 0).
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

  const updateMarkers = () => {
    // 3. Find unclustered points currently visible on screen
    const features = map.queryRenderedFeatures({ layers: ['unclustered-point-helper'] })
    const newMarkers: Record<string, maplibregl.Marker> = {}

    for (const feature of features) {
      const id = feature.properties.id
      const coords = (feature.geometry as any).coordinates

      if (newMarkers[id]) continue

      let marker = markers[id]
      if (!marker) {
        const el = createMarkerElement(id, feature.properties.hasThumbnails)
        marker = markers[id] = new maplibregl.Marker({ element: el }).setLngLat(coords)
      }

      newMarkers[id] = marker

      // Add to map if not already there
      if (!marker.getElement().parentElement) {
        marker.addTo(map)
      }
    }

    // 4. CLEANUP: Remove markers that went off-screen
    for (const id in markers) {
      if (!newMarkers[id]) {
        markers[id].remove()
        delete markers[id] // Clean memory
      }
    }
  }

  const throttledUpdate = useThrottleFn(updateMarkers, 100)

  map.on('move', throttledUpdate)
  map.on('moveend', throttledUpdate)
  map.on('data', (e) => {
    if (e.sourceId === 'photos' && e.isSourceLoaded) throttledUpdate()
  })

  // Initial call
  updateMarkers()
}

const createMarkerElement = (id: string, hasThumbnails: boolean) => {
  const el = document.createElement('div')
  el.className = 'circle-marker'
  const thumbUrl = mediaItemService.getPhotoThumbnail(id, getThumbnailHeight(100), !hasThumbnails)
  el.style.backgroundImage = `url(${thumbUrl})`
  return el
}

onUnmounted(() => {
  Object.values(markers).forEach((m) => m.remove())
})
</script>

<template>
  <main-layout-container>
    <!-- Ensure the container has height -->
    <div class="map-wrapper">
      <base-map
        class="map-instance"
        :map-options="{ center: [0, 20], zoom: 2 }"
        @load="handleMapLoad"
      />
    </div>
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

.circle-marker {
  width: 44px;
  height: 44px;
  border-radius: 8px;
  border: 2px solid white;
  background-size: cover;
  background-position: center;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
  cursor: pointer;
  /* Performance optimization */
  will-change: transform;
}

.circle-marker:hover {
  transform: scale(1.1);
  z-index: 10;
}
</style>
