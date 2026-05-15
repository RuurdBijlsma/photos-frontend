<script setup lang="ts">
import { ref, onMounted, onUnmounted, shallowRef } from 'vue'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

const props = withDefaults(
  defineProps<{
    width: string
    height: string
    center: { lon: number; lat: number }
    zoom: number
  }>(),
  {
    width: '100%',
    height: '500px',
    center: () => ({ lon: 0, lat: 0 }),
    zoom: 10,
  },
)

const mapContainer = ref<HTMLElement | null>(null)
const map = shallowRef<null | maplibregl.Map>(null)

onMounted(() => {
  if (!mapContainer.value) return
  map.value = new maplibregl.Map({
    container: mapContainer.value, // Bind to the div ref
    style: 'https://tiles.openfreemap.org/styles/liberty',
    center: props.center,
    zoom: props.zoom,
    attributionControl: {
      compact: true,
    },
  })
})

onUnmounted(() => {
  if (map.value) {
    map.value.remove()
  }
})
</script>

<template>
  <div
    ref="mapContainer"
    class="map-container"
    :style="{
      width,
      height,
    }"
  ></div>
</template>

<style scoped></style>
