<script setup lang="ts">
import type { MediaItemDto } from '@/script/types/api/photos.ts'
import photoService from '@/script/services/photoService.ts'
import { computed } from 'vue'

const props = defineProps<{
  mediaItem: MediaItemDto | undefined
  height: number
  width: number
}>()

const thumbnail = computed(() =>
  props.mediaItem?.i === null ? '' : photoService.getPhotoThumbnail(props.mediaItem?.i, 240),
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
  background-size: cover;
  display: block;

  content-visibility: auto;
  contain-intrinsic-size: 240px;
  contain: size layout paint;
  transform: translateZ(0);
}
</style>
