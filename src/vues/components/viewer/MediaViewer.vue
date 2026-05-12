<script setup lang="ts">
import type { PhotoViewerType } from '@/scripts/types/viewerType.ts'
import PhotoViewer from '@/vues/components/viewer/viewers/PhotoViewer.vue'
import VideoViewer from '@/vues/components/viewer/viewers/VideoViewer.vue'
import PanoViewer from '@/vues/components/viewer/viewers/PanoViewer.vue'

defineProps<{
  viewType: PhotoViewerType
  mediaItemId: string
}>()
</script>

<template>
  <div class="viewer-container">
    <photo-viewer :media-item-id="mediaItemId" v-if="viewType === 'photo'" />
    <video-viewer :media-item-id="mediaItemId" v-else-if="viewType === 'video'" />
    <pano-viewer :media-item-id="mediaItemId" v-if="viewType === 'panorama'" />
  </div>
</template>

<style scoped>
.viewer-container {
  position: relative;
}
</style>
