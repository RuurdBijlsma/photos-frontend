<script setup lang="ts">
import type { FileCountResponse } from '@/utils/api/types'

defineProps<{
  summary: FileCountResponse
  images: string[]
}>()
</script>

<template>
  <v-card rounded class="folder-card" variant="text">
    <v-card-title class="d-flex align-center card-title">
      <v-icon icon="mdi-eye-check-outline" class="mr-2"></v-icon>
      Media Files ({{
        (summary.photo_count + summary.video_count).toLocaleString()
      }}
      supported files)
    </v-card-title>
    <v-card-text>
      <p class="text-caption text-medium-emphasis mb-4">
        We've found {{ summary.photo_count.toLocaleString() }} photos and
        {{ summary.video_count.toLocaleString() }} videos in your library.
        Here's a preview of your collection:
      </p>
      <div class="image-grid">
        <div v-for="(url, index) in images" :key="index">
          <v-skeleton-loader
            v-if="!url"
            type="image"
            class="preview-skeleton"
          />
          <a
            v-ripple
            :href="url"
            target="_blank"
            v-tooltip:bottom="summary.samples[index]"
            v-else
            class="preview-image"
            :style="{ backgroundImage: `url(${url})` }"
          ></a>
        </div>
      </div>
    </v-card-text>
  </v-card>
</template>

<style scoped>
.card-title {
  font-weight: 600;
  color: rgba(0, 0, 0, 0.7);
  font-size: 17px;
}

.image-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 15px;
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
}

.preview-image:hover {
  border-radius: 15px;
}
</style>
