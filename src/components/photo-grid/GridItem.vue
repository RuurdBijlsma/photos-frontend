<script setup lang="ts">
import photoService from '@/script/services/photoService.ts'
import { computed } from 'vue'
import type { MediaItem } from '@/generated/photos'

const props = defineProps<{
  mediaItem: MediaItem | undefined
  height: number
  width: number
}>()

const thumbnail = computed(() =>
  props.mediaItem?.id === null ? '' : photoService.getPhotoThumbnail(props.mediaItem?.id, 240),
)
</script>

<template>
  <div
    class="grid-item"
    :style="{
      width: width + 'px',
      height: height + 'px',
      backgroundImage: `url(${thumbnail})`,
    }"
  ></div>
</template>

<style scoped>
.grid-item {
  background-color: rgba(255, 255, 255, 0.1);
  background-size: contain;
  display: block;

  content-visibility: auto;
  contain-intrinsic-size: 240px;
  contain: size layout paint;
  transform: translateZ(0);
}
</style>
