<script setup lang="ts">
import { useRoute } from 'vue-router'
import { useAlbumStore } from '@/scripts/stores/albumStore.ts'
import { computed, watch } from 'vue'
import TimelineContainer from '@/vues/components/media-timeline/TimelineContainer.vue'

const route = useRoute()
const albumStore = useAlbumStore()

const id = computed(() => route.params.id as string)
const controller = computed(() => albumStore.controllerCache.get(id.value))
watch(id, () => albumStore.createController(id.value), { immediate: true })
watch(controller, () => controller.value?.preFetch(), { immediate: true })
</script>

<template>
  <div v-if="controller" class="media-grid">
    <timeline-container class="album-timeline" :timeline-controller="controller" />
  </div>
</template>

<style scoped>
.media-grid {
  height: 100%;
  width: 100%;
}

.album-timeline {
  width: 100%;
  height: 100%;
}
</style>
