<script setup lang="ts">
import { type Map } from 'maplibre-gl'
import maplibregl from 'maplibre-gl'
import BaseMap from '@/vues/components/map/BaseMap.vue'
import MainLayoutContainer from '@/vues/components/MainLayoutContainer.vue'
import type { MapPhotosResponse } from '@/scripts/types/generated/timeline.ts'
import mediaItemService from '@/scripts/services/mediaItemService.ts'
import { getThumbnailHeight } from '@/scripts/utils.ts'
import { useThrottleFn } from '@vueuse/core'

const markers: Record<string, maplibregl.Marker> = {}
let markersOnScreen: Record<string, maplibregl.Marker> = {}

// Create the GeoJSON from photo items
const createGeoJson = (data: MapPhotosResponse) => {
  return {
    type: 'FeatureCollection',
    features: data.items.map((p) => ({
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
  }
}

const handleMapLoad = async (map: Map) => {
  const mapPhotos = await mediaItemService.listMapPhotos()
  const geoJson = createGeoJson(mapPhotos) as GeoJSON.GeoJSON

  map.addSource('photos', {
    type: 'geojson',
    data: geoJson,
    cluster: true,
    clusterMaxZoom: 17,
    clusterRadius: 40,
    clusterProperties: {},
  })

  // Add an invisible layer to force MapLibre to index the features.
  map.addLayer({
    id: 'photos-helper-layer',
    type: 'circle',
    source: 'photos',
    paint: {
      'circle-opacity': 0,
      'circle-radius': 5,
      'circle-color': '#ff0000',
    },
  })

  // Function to update markers on screen
  const updateMarkers = () => {
    console.log('Update markers', performance.now())
    // Check if source exists yet
    if (!map.getSource('photos')) return
    const newMarkers: Record<string, maplibregl.Marker> = {}
    // querySourceFeatures returns features in loaded tiles
    const features = map.querySourceFeatures('photos')

    for (const feature of features) {
      if (!('coordinates' in feature.geometry)) continue
      const coords = feature.geometry.coordinates
      const props = feature.properties as CreateMarkerPhotoProps | CreateMarkerClusterProps
      const id = 'cluster' in props ? `cluster-${props.cluster_id}` : props.id

      // skip duplicate features in the same viewport frame
      if (newMarkers[id]) continue

      let marker = markers[id]
      if (!marker) {
        const el = createMarkerElement(props)
        marker = markers[id] = new maplibregl.Marker({ element: el }).setLngLat(
          coords as [number, number],
        )
      }
      newMarkers[id] = marker

      if (!markersOnScreen[id]) {
        marker.addTo(map)
      }
    }
    // Remove markers that are no longer in the current viewport
    for (const id in markersOnScreen) {
      if (!newMarkers[id]) {
        markersOnScreen[id].remove()
      }
    }
    markersOnScreen = newMarkers
  }

  const throttledUpdateMarker = useThrottleFn(() => updateMarkers(), 500)

  // Listen to map events to update markers
  map.on('move', throttledUpdateMarker)
  map.on('moveend', throttledUpdateMarker)

  // 'data' fires when the source is loaded/updated
  map.on('data', (e: DataEvent) => {
    if (e.sourceId !== 'photos' || !e.isSourceLoaded) return
    throttledUpdateMarker()
  })

  // Initial call
  updateMarkers()
}

type DataEvent = { sourceId: string; isSourceLoaded: boolean }
type CreateMarkerClusterProps = {
  cluster: boolean
  cluster_id: number
  point_count: number
  point_count_abbreviated: string
}
type CreateMarkerPhotoProps = {
  id: string
  hasThumbnails: boolean
}
type CreateMarkerProps = CreateMarkerPhotoProps | CreateMarkerClusterProps

// Make HTML element for marker
const createMarkerElement = (props: CreateMarkerProps) => {
  const el = document.createElement('div')
  el.className = 'circle-marker'

  if ('cluster' in props) {
    // Cluster Style
    el.className += ' cluster-marker'
    el.innerHTML = `<span>${props.point_count}</span>`
  } else {
    // Individual Photo Style
    const thumbUrl = mediaItemService.getPhotoThumbnail(
      props.id,
      getThumbnailHeight(100),
      !props.hasThumbnails,
    )
    el.style.backgroundImage = `url(${thumbUrl})`
  }
  return el
}
</script>

<template>
  <main-layout-container>
    <base-map class="map" :map-options="{ center: [0, 20], zoom: 2 }" @load="handleMapLoad" />
  </main-layout-container>
</template>

<style>
.map {
  width: 100%;
  height: 80vh;
  position: relative;
}

.circle-marker {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  border: 2px solid white;
  background-size: cover;
  background-position: center;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
  cursor: pointer;
}

.circle-marker:hover {
  transform: scale(1.1);
  z-index: 10;
}

.cluster-marker {
  background-color: #3b82f6;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-family: sans-serif;
  border-radius: 50%;
}
</style>
