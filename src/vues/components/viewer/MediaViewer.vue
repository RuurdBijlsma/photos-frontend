<script setup lang="ts">
import { defineAsyncComponent } from 'vue'
import type { PhotoViewerType } from '@/scripts/types/viewerType.ts'

const PhotoViewer = defineAsyncComponent(
  () => import('@/vues/components/viewer/viewers/PhotoViewer.vue'),
)
const VideoViewer = defineAsyncComponent(
  () => import('@/vues/components/viewer/viewers/VideoViewer.vue'),
)

// todo: use media viewer in location estimatr

defineProps<{
  disableEventCapture: boolean
  viewType: PhotoViewerType
  mediaItemId: string
  muted: boolean
  showUi?: boolean
}>()

const emit = defineEmits<{
  (e: 'zoom-change', isZoomed: boolean): void
}>()
</script>

<template>
  <div class="viewer-container">
    <photo-viewer
      :media-item-id="mediaItemId"
      v-if="viewType === 'photo' || viewType === 'panorama'"
      :disable-event-capture="disableEventCapture"
      :show-ui="showUi"
      @zoom-change="emit('zoom-change', $event)"
    />
    <video-viewer :media-item-id="mediaItemId" v-else-if="viewType === 'video'" :muted="muted" />
  </div>
</template>

<style scoped>
.viewer-container {
  position: relative;
}
</style>
