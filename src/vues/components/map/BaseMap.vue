<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import maplibregl, { type MapOptions } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

type MapOptionsWithoutContainer = Omit<MapOptions, 'container' | 'style'>

const props = withDefaults(
  defineProps<{
    mapOptions: MapOptionsWithoutContainer
  }>(),
  {
    mapOptions: () => ({
      center: { lon: 0, lat: 0 },
      zoom: 2,
      attributionControl: {
        compact: true,
      },
    }),
  },
)

const emit = defineEmits(['load', 'style.load'])

const mapContainer = ref<HTMLElement | null>(null)
let map: null | maplibregl.Map = null

onMounted(() => {
  if (!mapContainer.value) return
  map = new maplibregl.Map({
    ...props.mapOptions,
    container: mapContainer.value,
    style: 'https://tiles.openfreemap.org/styles/liberty',
  })

  map.on('load', () => {
    emit('load', map)
  })

  map.on('style.load', () => {
    emit('style.load', map)
  })
})

onUnmounted(() => {
  if (map) map.remove()
})
</script>

<template>
  <div ref="mapContainer"></div>
</template>
