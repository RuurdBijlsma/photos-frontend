<script setup lang="ts">
import { CURRENT_YEAR, MONTHS } from '@/scripts/constants.ts'
import photoService from '@/scripts/services/photoService.ts'
import { useTimelineStore } from '@/scripts/stores/timeline/timelineStore.ts'
import type { LayoutRow } from '@/scripts/types/timeline/layout.ts'

const timelineStore = useTimelineStore()
defineProps<{
  item: LayoutRow
  containerWidth: number
  itemGap: number
}>()
</script>

<template>
  <div style="width: 100%">
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
      <div
        v-for="mediaItem in item.items"
        :key="mediaItem.index"
        class="virtual-scroll-item"
        :style="{
          backgroundImage: `url(${photoService.getPhotoThumbnail(timelineStore.monthItems.get(item.monthId)?.[mediaItem.index]?.id, item.thumbnailSize)})`,
          width: `${Math.round(mediaItem.ratio * item.height)}px`,
          height: `${Math.round(item.height)}px`,
        }"
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
  border-top-left-radius: 40px;
  border-top-right-radius: 40px;
}

.last-of-the-month-row {
  border-bottom-left-radius: 40px;
  border-bottom-right-radius: 40px;
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

.virtual-scroll-item {
  flex: 0 0 auto;
  background-color: rgba(255, 255, 255, 0.05);
  background-position: center;
  background-repeat: no-repeat;
  background-size: cover;
}
</style>
