<script setup lang="ts">
import { useSettingStore } from '@/scripts/stores/settingsStore.ts'
import { computed } from 'vue'
import mediaItemService from '@/scripts/services/mediaItemService.ts'
import { getThumbnailHeight } from '@/scripts/utils.ts'
import { useWindowSize } from '@vueuse/core'
import { useMediaItemStore } from '@/scripts/stores/timeline/mediaItemStore.ts'

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
