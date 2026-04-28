<script setup lang="ts">
import GlowImage from '@/vues/components/ui/GlowImage.vue'
import { computed, ref } from 'vue'
import mediaItemService from '@/scripts/services/mediaItemService.ts'
import { getThumbnailHeight } from '@/scripts/utils.ts'

const props = withDefaults(
  defineProps<{
    mediaItemId: string
    height?: number
    width?: number
    maxWidth?: number
    borderRadius?: string
    strength?: number
  }>(),
  {
    borderRadius: '0',
    strength: 1,
  },
)
const useOnDemandThumb = ref(false)
const thumbHeight = computed(() => getThumbnailHeight(props.height ?? 480))
const primaryThumb = computed(() =>
  mediaItemService.getPhotoThumbnail(props.mediaItemId, thumbHeight.value, useOnDemandThumb.value),
)
</script>

<template>
  <glow-image
    :src="primaryThumb"
    :height="height"
    :width="width"
    :max-width="maxWidth"
    :border-radius="borderRadius"
    :strength="strength"
    @error="useOnDemandThumb = true"
  />
</template>

<style scoped></style>
