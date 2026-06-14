<script setup lang="ts">
import type { DailyCardResponse } from '@/scripts/types/api/dailyCards.ts'
import ThumbnailImg from '@/vues/components/ui/ThumbnailImg.vue'
import { useDailyCardStore } from '@/scripts/stores/timeline/dailyCardStore.ts'
import { computed, watch } from 'vue'
import mediaItemService from '@/scripts/services/mediaItemService.ts'
import { getThumbnailHeight } from '@/scripts/utils.ts'

const props = defineProps<{
  card: DailyCardResponse
}>()

const cardStore = useDailyCardStore()

const mediaItems = computed(() => cardStore.getPayloadItems(props.card))

watch(
  () => props.card,
  () => {
    console.log('View collection card', props.card)
  },
  { immediate: true },
)
</script>

<template>
  <div class="collection-container">
    <h1>{{ card.title }}</h1>
    <h4 v-if="card.subtitle">{{ card.subtitle }}</h4>
    <thumbnail-img
      v-for="item in mediaItems"
      :key="item.id"
      :media-item-id="item.id"
    />
  </div>
</template>

<style scoped>
.collection-container{
  overflow-y: auto;
  height:100%;
  width:100%;
}
</style>
