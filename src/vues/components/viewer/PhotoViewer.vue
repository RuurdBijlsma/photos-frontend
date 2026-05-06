<script setup lang="ts">
import { useSettingStore } from '@/scripts/stores/settingsStore.ts'
import { computed } from 'vue'
import mediaItemService from '@/scripts/services/mediaItemService.ts'
import { getThumbnailHeight } from '@/scripts/utils.ts'
import { useWindowSize } from '@vueuse/core'
import { useMediaItemStore } from '@/scripts/stores/timeline/mediaItemStore.ts'

// TODO:
// step 1: make required backend endpoints
// * Initially load thumbnail AVIF image from getPhotoThumbnail
// * In background load full original quality image (we'll need endpoint to load full quality image)
// * When that's loaded, replace AVIF image with full quality image (will support embedded gain map for prettier image)
// * zoom & pan support. When zooming, zoom in on where the cursor is.
// * Motion photo support:
//   * on load, play motion photo video that's embedded in the original file (this needs some backend support to know when a file has a motion video embedded, and an endpoint to stream the video)
//   * after motion video is done, show original image.
//   * show some kind of UI chip [Motion] when the user clicks it the video plays again (once)
// * Image must be shown using <img> tag, for gain map support

const props = defineProps<{
  mediaItemId: string
}>()

const windowSize = useWindowSize()
const mediaItemStore = useMediaItemStore()
const settings = useSettingStore()

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
  <div
    v-if="settings.useImageGlow"
    class="blurry-bg"
    :style="{
      backgroundImage: `url(${imageUrl})`,
    }"
  ></div>
  <img class="image-tag" :src="imageUrl" alt="Full size image" />
</template>

<style scoped>
.blurry-bg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-size: contain;
  background-position: center;
  filter: blur(50px) brightness(60%);
}

.image-tag {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
}
</style>
