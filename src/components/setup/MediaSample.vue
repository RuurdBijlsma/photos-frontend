<script setup lang="ts">
import type { MediaSampleResponse } from '@/utils/types/api'

defineProps<{
  mediaSamples: MediaSampleResponse
  images: { imageUrl: string; relPath: string }[]
}>()
</script>

<template>
  <v-card rounded class="folder-card" variant="text" color="primary">
    <v-card-title class="d-flex align-center card-title">
      <v-icon icon="mdi-eye-check-outline" class="mr-2"></v-icon>
      Media Files ({{
        (mediaSamples.photo_count + mediaSamples.video_count).toLocaleString()
      }}
      supported files)
    </v-card-title>
    <v-card-text>
      <p class="text-caption text-medium-emphasis mb-4">
        We've found {{ mediaSamples.photo_count.toLocaleString() }} photos and
        {{ mediaSamples.video_count.toLocaleString() }} videos in your library.
        <span v-if="mediaSamples.photo_count > 0">
          Here's a preview of your collection:
        </span>
      </p>
      <div class="image-grid">
        <div v-for="(imageSample, index) in images" :key="index">
          <v-skeleton-loader
            v-if="!imageSample.imageUrl"
            type="image"
            class="preview-skeleton"
          />
          <a
            v-ripple
            :href="imageSample.imageUrl"
            target="_blank"
            v-tooltip:top="imageSample.relPath"
            v-else
            class="preview-image"
            :style="{ backgroundImage: `url(${imageSample.imageUrl})` }"
          ></a>
        </div>
      </div>
    </v-card-text>
  </v-card>
</template>

<style scoped>
.image-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 15px;
}

.preview-skeleton {
  border-radius: 50%;
  overflow: hidden;
}

.preview-image {
  width: 100%;
  background-position: center;
  background-repeat: no-repeat;
  background-size: cover;
  border-radius: 50%;
  cursor: pointer;
  display: block;
  transition: border-radius 0.15s;
  aspect-ratio: 1;
  image-rendering: smooth;
  will-change: border-radius;
}

.preview-image:hover {
  border-radius: 15px;
}
</style>
