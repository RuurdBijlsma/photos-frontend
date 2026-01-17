<script setup lang="ts">
import { CURRENT_YEAR, MONTHS } from '@/scripts/constants.ts'
import { useTimelineStore } from '@/scripts/stores/timeline/timelineStore.ts'
import type { LayoutRow } from '@/scripts/types/timeline/layout.ts'
import { computed } from 'vue'
import GridItem from '@/vues/components/timeline/GridItem.vue'

const timelineStore = useTimelineStore()

const props = defineProps<{
  item: LayoutRow
  containerWidth: number
  itemGap: number
  isScrollingFast: boolean
}>()

const monthItems = computed(() => timelineStore.monthItems.get(props.item.monthId) ?? [])
</script>

<template>
  <div>
    <div class="row-date-header" v-if="item.firstOfTheMonth">
      <h2>{{ MONTHS[item.date.getMonth()] }}</h2>
      <h3 v-if="item.date.getFullYear() !== CURRENT_YEAR">
        {{ item.date.getFullYear() }}
      </h3>
    </div>
    <div
      :class="{
        'first-of-the-month-row': item.firstOfTheMonth,
        'last-of-the-month-row': item.lastOfTheMonth,
      }"
      class="virtual-scroll-row"
      :style="{
        height: `${Math.round(item.height)}px`,
        width: `${containerWidth}px`,
        marginBottom: item.lastOfTheMonth ? '0px' : `${itemGap}px`,
      }"
    >
      <grid-item
        v-for="mediaItem in item.items"
        :key="mediaItem.index"
        :width="Math.round(mediaItem.ratio * item.height)"
        :height="Math.round(item.height)"
        :thumbnail-size="item.thumbnailSize"
        :media-item="monthItems[mediaItem.index]"
        :is-scrolling-fast="isScrollingFast"
      />
    </div>
  </div>
</template>

<style scoped>
.virtual-scroll-row {
  display: flex;
  gap: var(--item-gap);
  overflow: hidden;
}

.first-of-the-month-row {
  border-top-left-radius: 25px;
  border-top-right-radius: 25px;
}

.last-of-the-month-row {
  border-bottom-left-radius: 25px;
  border-bottom-right-radius: 25px;
}

.row-date-header {
  padding: 20px 30px;
  display: flex;
  align-items: flex-end;
}

.row-date-header h2 {
  font-size: 24px;
  font-weight: 600;
}

.row-date-header h3 {
  font-size: 18px;
  font-weight: 400;
  opacity: 0.7;
  margin-left: 20px;
  padding-bottom: 1px;
}
</style>
