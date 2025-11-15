<script setup lang="ts">
import type { MediaSampleResponse } from '@/scripts/types/api/setup.ts'

defineProps<{
  mediaSamples: MediaSampleResponse | null
  images: { imageUrl: string; relPath: string }[]
}>()
</script>

<template>
  <v-card rounded class="folder-card" variant="text" color="primary">
    <v-card-title class="d-flex align-center card-title">
      <v-icon icon="mdi-eye-check-outline" class="mr-2"></v-icon>
      <template v-if="mediaSamples">
        Media Files ({{ (mediaSamples.photoCount + mediaSamples.videoCount).toLocaleString() }}
        supported files)
      </template>
      <template v-else> Media Files (... supposed files)</template>
    </v-card-title>
    <v-card-text>
      <p class="text-caption text-medium-emphasis mb-4">
        <template v-if="mediaSamples">
          We've found {{ mediaSamples.photoCount.toLocaleString() }} photos and
          {{ mediaSamples.videoCount.toLocaleString() }} videos in your library.
          <span v-if="mediaSamples.photoCount > 0"> Here's a preview of your collection: </span>
        </template>
        <template v-else>
          We're loading some media samples from your server so you can inspect them.
        </template>
      </p>
      <div class="image-grid">
        <div v-for="(imageSample, index) in images" :key="index">
          <div v-if="!imageSample.imageUrl" class="preview-skeleton">
            <v-progress-circular :size="130" indeterminate color="surface-container"/>
          </div>
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
  width: 100%;
  border-radius: 50%;
  cursor: progress;
  transition: border-radius 0.15s;
  aspect-ratio: 1;
  will-change: border-radius;
  background-color: rgb(var(--v-theme-surface-container));
  display: flex;
  justify-content: center;
  align-items: center;
}

.preview-skeleton:hover {
  border-radius: 15px;
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
  background-color: rgb(var(--v-theme-surface-container));
}

.preview-image:hover {
  border-radius: 15px;
}
</style>
