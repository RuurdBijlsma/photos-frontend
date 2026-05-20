<script setup lang="ts">
import type { SimpleTimelineItem } from '@/scripts/types/generated/timeline.ts'
import mediaItemService from '@/scripts/services/mediaItemService.ts'

const props = defineProps<{
  item: SimpleTimelineItem
}>()

const emit = defineEmits<{
  (e: 'open'): void
}>()

const thumbSrc = () =>
  mediaItemService.getPhotoThumbnail(props.item.id, 480, !props.item.hasThumbnails)
</script>

<template>
  <button type="button" class="map-preview-card" @click="emit('open')">
    <img v-if="!item.isVideo" class="map-preview-media" :src="thumbSrc()" alt="" />
    <video
      v-else
      class="map-preview-media"
      autoplay
      muted
      loop
      playsinline
      :src="mediaItemService.getVideo(item.id, 480, !item.hasThumbnails)"
    />
  </button>
</template>

<style scoped>
.map-preview-card {
  display: block;
  position: relative;
  border: none;
  padding: 5px;
  border-radius: 20px;
  overflow: hidden;
  cursor: pointer;
  background: white;
  box-shadow:
    0 8px 28px rgba(0, 0, 0, 0.35),
    0 0 0 1px rgba(255, 255, 255, 0.85);
  transition: transform 0.15s ease;
}

.map-preview-card:hover {
  transform: scale(1.02);
}

.map-preview-media {
  border-radius:15px;
  display: block;
  max-width: min(400px, 50vw);
  max-height: min(400px, 50vh);
  width: auto;
  height: auto;
  object-fit: contain;
}
</style>
