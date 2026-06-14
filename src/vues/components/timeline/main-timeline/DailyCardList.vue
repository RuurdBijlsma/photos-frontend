<script setup lang="ts">
import { useDailyCardStore } from '@/scripts/stores/timeline/dailyCardStore.ts'
import { computed, onMounted, watch } from 'vue'
import DailyCard from '@/vues/components/timeline/main-timeline/DailyCard.vue'

defineProps<{
  width: number
}>()

const cardStore = useDailyCardStore()
const cards = computed(() => cardStore.todayCards)

watch(
  cards,
  () => {
    console.log('CARDS', cards.value)
  },
  { immediate: true },
)

onMounted(() => cardStore.fetchDailyCards())
</script>

<template>
  <div class="daily-cards">
    <daily-card :card="card" :width="500" v-for="card in cards" :key="card.id" />
  </div>
</template>

<style scoped>
.daily-cards {
  width: calc(v-bind(width) * 1px);
  height: 300px;
  position: relative;
  display: flex;
  gap: 20px;
  padding: 15px;
  overflow-x: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}
</style>
