<!-- File: src/vues/components/viewer/viewers/PanoViewer.vue -->
<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useWindowSize } from '@vueuse/core'
import { useMediaItemStore } from '@/scripts/stores/timeline/mediaItemStore.ts'
import mediaItemService from '@/scripts/services/mediaItemService.ts'
import { getThumbnailHeight } from '@/scripts/utils.ts'
import PanoramaViewer from '@/vues/components/viewer/PanoramaViewer.vue'

const props = defineProps<{
  mediaItemId: string
}>()

const windowSize = useWindowSize()
const mediaItemStore = useMediaItemStore()

// Toggle states between standard image viewer and 3D WebGL mode
const is3DMode = ref(false)

const fullImage = computed(() => mediaItemStore.mediaItems.get(props.mediaItemId))
const generatedThumbsAvailable = computed(() => fullImage.value?.has_thumbnails ?? true)

// Fallback flat 2D projection view
const imageUrl = computed(() => {
  const imageU = mediaItemService.getPhotoThumbnail(
    props.mediaItemId,
    getThumbnailHeight(windowSize.height.value),
    !generatedThumbsAvailable.value,
  )
  return imageU
})

// Extract the configuration schema
const panoramaConfig = computed(() => fullImage.value?.panorama_config)

function toggleMode() {
  is3DMode.value = !is3DMode.value
}

// Reset view type back to flat mode when switching items
watch(
  () => props.mediaItemId,
  () => {
    is3DMode.value = false
  },
)
</script>

<template>
  <div class="pano-viewer-wrapper">
    <!-- 3D mode: Lazy instantiated when is3DMode is toggled to true -->
    <template v-if="is3DMode && panoramaConfig">
      <PanoramaViewer
        :config="panoramaConfig"
        :base-url="`http://localhost:9475/hosted/pano/${mediaItemId}`"
      />
    </template>

    <!-- 2D flat mode: Initially active -->
    <template v-else>
      <div class="flat-image-container">
        <img class="image-tag" :src="imageUrl" alt="Flat panorama view" />
      </div>
    </template>

    <!-- Overlay Toggle Control -->
    <div class="pano-controls-overlay" v-if="panoramaConfig">
      <v-btn
        rounded="xl"
        elevation="6"
        color="primary"
        size="large"
        @click="toggleMode"
        class="toggle-btn"
      >
        <v-icon start :icon="is3DMode ? 'mdi-image-outline' : 'mdi-panorama-variant-outline'" />
        {{ is3DMode ? 'View as Flat Photo' : 'Enter 3D Panorama' }}
      </v-btn>
    </div>
  </div>
</template>

<style scoped>
.pano-viewer-wrapper {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: #000;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.flat-image-container {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.image-tag {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.pano-controls-overlay {
  position: absolute;
  bottom: 40px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1550; /* Placed safely on top of the base viewer UI */
  pointer-events: auto;
}

.toggle-btn {
  text-transform: none;
  font-family: Jost, sans-serif;
  font-weight: 500;
  letter-spacing: 0.5px;
}
</style>
