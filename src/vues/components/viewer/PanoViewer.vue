<script setup lang="ts">
// TODO:
// * Initially show full panorama image, with button to go into 3d mode
// * 3d panorama viewer (three.js?)
// * Use is_photosphere projection_type horizontal_fov_deg vertical_fov_deg center_yaw_deg center_pitch_deg etc. to set proper camera viewpoint
// * if possible, only load three.js stuff when 3d viewer is opened, to keep load times as low as possible
// * there should be an option to view as pano, and one to view as regular photo.

import { useWindowSize } from '@vueuse/core'
import { useMediaItemStore } from '@/scripts/stores/timeline/mediaItemStore.ts'
import { computed } from 'vue'
import mediaItemService from '@/scripts/services/mediaItemService.ts'
import { getThumbnailHeight } from '@/scripts/utils.ts'

const props = defineProps<{
  mediaItemId: string
}>()

const windowSize = useWindowSize()
const mediaItemStore = useMediaItemStore()

const generatedThumbsAvailable = computed(() => fullImage.value?.has_thumbnails ?? true)
const imageUrl = computed(() => {
  const imageU = mediaItemService.getPhotoThumbnail(
    props.mediaItemId,
    getThumbnailHeight(windowSize.height.value),
    !generatedThumbsAvailable.value,
  )
  console.log({ imageU })
  return imageU
})
const fullImage = computed(() => mediaItemStore.mediaItems.get(props.mediaItemId))
</script>

<template>
  <h1>Pano viewer</h1>
  <h1>Pano viewer</h1>
  <h1>Pano viewer</h1>
  <img class="image-tag" :src="imageUrl" alt="Full size image" />
</template>

<style scoped>
.image-tag {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
}
</style>
