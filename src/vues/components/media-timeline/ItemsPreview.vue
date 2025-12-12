<script setup lang="ts">
import photoService from '@/scripts/services/photoService.ts'
import { computed } from 'vue'

const props = defineProps<{
  mediaItemIds: string[]
}>()

const truncatedIds = computed(() => props.mediaItemIds.slice(0, 5))
</script>

<template>
  <div class="album-preview">
    <div class="image-stack">
      <div
        v-for="(id, i) in truncatedIds"
        :key="id"
        class="stacked-img"
        :style="{
          '--percentage': (truncatedIds.length - i) * (1 / truncatedIds.length),
          '--i': i,
          backgroundImage: `url(${photoService.getPhotoThumbnail(id, 144)})`,
        }"
      />
    </div>

    <p class="items-text">
      <b>{{ mediaItemIds.length }}</b> item{{ mediaItemIds.length === 1 ? '' : 's' }}
    </p>
  </div>
</template>

<style scoped>
.album-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.image-stack {
  margin-top: 40px;
  margin-bottom: 30px;
  width: 90px;
  height: 90px;
  position: relative;
}

.stacked-img {
  position: absolute;
  top: 0;
  left: 0;

  width: 100%;
  height: 100%;

  border-radius: 8px;
  object-fit: cover;
  background-size: cover;
  background-position: center;
  box-shadow: 0 -3px 8px 0 rgba(0, 0, 0, 0.2);

  /* Stack offset per image */
  z-index: calc(100 - var(--i));
  transform: translateY(calc((1 - var(--percentage)) * -50px))
    scale(calc(1 + var(--percentage) / 3));
  opacity: calc(pow(var(--percentage), 2));
}
</style>
