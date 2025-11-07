<script setup lang="ts">
import photoService from '@/scripts/services/photoService.ts'
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useMediaStore } from '@/scripts/stores/mediaStore.ts'
import type { MediaItem } from '@/scripts/types/generated/photos.ts'

const mediaStore = useMediaStore()
const router = useRouter()

const props = defineProps<{
  mediaItem?: MediaItem
  height: number
  width: number
}>()

const thumbnail = computed(() =>
  props.mediaItem?.id === null ? '' : photoService.getPhotoThumbnail(props.mediaItem?.id, 240),
)

async function openImage() {
  const id = props.mediaItem?.id
  if (id) await router.push({ path: `/view/${id}` })
}

async function preventOpen(e: PointerEvent) {
  if (e.button === 0 && !e.ctrlKey) {
    e.preventDefault()
  }
}
</script>

<template>
  <router-link :to="`/view/${props.mediaItem?.id}`">
    <div
      @click="preventOpen"
      @dblclick="openImage"
      @mousedown="mediaStore.fetchItem(props.mediaItem?.id)"
      class="grid-item"
      :style="{
        width: width + 'px',
        height: height + 'px',
        backgroundImage: `url(${thumbnail})`,
      }"
    ></div>
  </router-link>
</template>

<style scoped>
.grid-item {
  background-color: rgba(255, 255, 255, 0.1);
  background-size: contain;
  display: block;
  cursor: default;

  content-visibility: auto;
  contain-intrinsic-size: 240px;
  contain: size layout paint;
  transform: translateZ(0);
}
</style>
