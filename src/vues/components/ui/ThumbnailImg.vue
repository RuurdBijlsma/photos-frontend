<script setup lang="ts">
import { ref } from 'vue'
import mediaItemService from '@/scripts/services/mediaItemService.ts'

withDefaults(
  defineProps<{
    mediaItemId: string
    height?: number
    width?: number
    cover?: boolean
  }>(),
  {},
)

const useOnDemandThumb = ref(new Map<string | null, boolean>())
</script>

<template>
  <v-img
    :height="height"
    :width="width"
    :cover="cover"
    :src="
      mediaItemService.getPhotoThumbnail(
        mediaItemId,
        height ?? 480,
        useOnDemandThumb.get(mediaItemId),
      )
    "
    @error="useOnDemandThumb.set(mediaItemId, true)"
  />
</template>

<style scoped></style>
