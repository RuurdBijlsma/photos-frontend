<script setup lang="ts">
import { useRoute } from 'vue-router'
import { useAlbumStore } from '@/scripts/stores/albumStore.ts'
import { computed, watch } from 'vue'
import TimelineContainer from '@/vues/components/media-timeline/TimelineContainer.vue'
import photoService from '@/scripts/services/photoService.ts'

const route = useRoute()
const albumStore = useAlbumStore()

const id = computed(() => route.params.id as string)
const controller = computed(() => albumStore.controllerCache.get(id.value))
const album = computed(() => controller.value?.albumInfo)

watch(id, () => albumStore.createController(id.value), { immediate: true })
watch(controller, () => controller.value?.preFetch(), { immediate: true })
</script>

<template>
  <timeline-container
    v-if="controller"
    class="album-timeline"
    :timeline-controller="controller"
    sort-direction="desc"
  >
    <div class="album-summary" v-if="album">
      <div class="album-thumbnail">
        <v-img
          width="300"
          v-if="album.thumbnailId"
          :src="photoService.getPhotoThumbnail(album.thumbnailId, 720)"
        />
      </div>
      <div class="album-summary-text">
        <h1 class="editable-title" contenteditable="plaintext-only">{{ album.name }}</h1>
        <p v-if="album.description">{{ album.description }}</p>
      </div>
    </div>
  </timeline-container>
</template>

<style scoped>
.album-timeline {
  width: 100%;
  height: 100%;
}

.album-summary {
  display: flex;
  padding-top: 7px;
  min-height: 216px;
}

.album-thumbnail {
  flex-grow: 1;
  display: flex;
  align-items: center;
}

.album-thumbnail > * {
  border-radius: 30px;
}

.album-summary-text {
  flex-grow: 10;
  padding: 20px;
}

.editable-title {
  font-weight: 400;
  padding: 5px 15px;
  border-radius: 20px;
  font-size: 40px;
  width: calc(100% - 30px);
}
</style>
