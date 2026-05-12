<script setup lang="ts">
// TODO:
// * video player to play video
// * Use existing video endpoint (see mediaItemService.getVideo definition and usage)
// * Native browser player is probably fine
// * autoplay on load

import mediaItemService from '@/scripts/services/mediaItemService.ts'
import { computed } from 'vue'
import { getVideoHeight } from '@/scripts/utils.ts'
import { useWindowSize } from '@vueuse/core'
import { useMediaItemStore } from '@/scripts/stores/timeline/mediaItemStore.ts'

const props = defineProps<{
  mediaItemId: string
}>()

const windowSize = useWindowSize()
const mediaItemStore = useMediaItemStore()

const generatedThumbsAvailable = computed(() => fullImage.value?.has_thumbnails ?? true)
const videoUrl = computed(() => {
  const videoU = mediaItemService.getVideo(
    props.mediaItemId,
    getVideoHeight(windowSize.height.value),
    !generatedThumbsAvailable.value,
  )
  console.log({ videoU })
  return videoU
})
const fullImage = computed(() => mediaItemStore.mediaItems.get(props.mediaItemId))
</script>

<template>
  <div class="video-viewer">
    <video controls autoplay :src="videoUrl" loop />
  </div>
</template>

<style scoped>
.video-viewer {
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  background-color: black;
  color: white;
  display: flex;
  place-items: center;
}

.video-viewer video {
  width: 100%;
  height: 100%;
  margin: 0;
}

.video-viewer video:focus{
  outline: none;
}
</style>
