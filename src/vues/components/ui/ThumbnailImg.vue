<script setup lang="ts">
import { ref } from 'vue'
import mediaItemService from '@/scripts/services/mediaItemService.ts'

withDefaults(
  defineProps<{
    mediaItemId: string
    height: number
  }>(),
  {
    height: 480,
  },
)

const useOnDemandThumb = ref(new Map<string | null, boolean>())
</script>

<template>
  <v-img
    :src="
      mediaItemService.getPhotoThumbnail(mediaItemId, height, useOnDemandThumb.get(mediaItemId))
    "
    @error="useOnDemandThumb.set(mediaItemId, true)"
  />
</template>

<style scoped></style>
