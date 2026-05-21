<script setup lang="ts">
import { ref, onMounted, onUnmounted, shallowRef } from 'vue'
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

const emit = defineEmits(['load'])

const mapContainer = ref<HTMLElement | null>(null)
const map = shallowRef<null | maplibregl.Map>(null)

onMounted(() => {
  if (!mapContainer.value) return
  map.value = new maplibregl.Map({
    ...props.mapOptions,
    container: mapContainer.value,
    style: 'https://tiles.openfreemap.org/styles/liberty',
  })

  map.value.on('load', () => {
    emit('load', map.value)
  })
})

onUnmounted(() => {
  if (map.value) map.value.remove()
})
</script>

<template>
  <div ref="mapContainer" ></div>
</template>
