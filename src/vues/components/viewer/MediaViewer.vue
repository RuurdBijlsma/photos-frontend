<script setup lang="ts">
import { defineAsyncComponent } from 'vue'
import type { PhotoViewerType } from '@/scripts/types/viewerType.ts'

const PhotoViewer = defineAsyncComponent(
  () => import('@/vues/components/viewer/viewers/PhotoViewer.vue'),
)
const VideoViewer = defineAsyncComponent(
  () => import('@/vues/components/viewer/viewers/VideoViewer.vue'),
)
const PanoViewer = defineAsyncComponent(
  () => import('@/vues/components/viewer/viewers/PanoViewer.vue'),
)

defineProps<{
  viewType: PhotoViewerType
  mediaItemId: string
  muted: boolean
}>()
</script>

<template>
  <div class="viewer-container">
    <photo-viewer :media-item-id="mediaItemId" v-if="viewType === 'photo'" />
    <video-viewer :media-item-id="mediaItemId" v-else-if="viewType === 'video'" :muted="muted" />
    <pano-viewer :media-item-id="mediaItemId" v-if="viewType === 'panorama'" />
  </div>
</template>

<style scoped>
.viewer-container {
  position: relative;
}
</style>
