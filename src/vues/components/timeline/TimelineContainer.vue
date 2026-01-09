<script setup lang="ts">
import MainLayoutContainer from '@/vues/components/MainLayoutContainer.vue'
import { computed, ref, useTemplateRef, watch } from 'vue'
import { useResizeObserver } from '@vueuse/core'
import type { TimelineMonthRatios } from '@/scripts/types/generated/timeline.ts'
import { useTimelineStore } from '@/scripts/stores/timeline/timelineStore.ts'

const timelineStore = useTimelineStore()

const containerSize = ref({ width: 0, height: 0 })
const scrollContainerEl = useTemplateRef('scrollContainer')
useResizeObserver(scrollContainerEl, (entries) => {
  if (entries[0]) {
    containerSize.value = {
      width: entries[0].contentRect.width,
      height: entries[0].contentRect.height,
    }
  }
})

const IDEAL_ROW_HEIGHT = 240
const MAX_SIZE_MULTIPLIER = 1.5
const ITEM_GAP = 5
const ITEM_GAP_PX = ITEM_GAP + 'px'

interface LayoutRow {
  items: LayoutRowItem[]
  height: number
  monthId: string
  firstRowOfTheMonth: boolean
  lastRowOfTheMonth: boolean
  key: string
  offsetTop: number
}

interface LayoutRowItem {
  ratio: number
  index: number
}

function calculateLayout(monthRatios: TimelineMonthRatios[], containerWidth: number) {
  if (monthRatios.length === 0 || containerWidth === 0) return []
  console.log(monthRatios, containerWidth)
  const layoutRows: LayoutRow[] = []
  let offsetTop = ITEM_GAP

  for (const { monthId, ratios } of monthRatios) {
    let firstRowOfTheMonth = true
    let itemsWidth = 0
    let rowItems: LayoutRowItem[] = []

    for (const [i, ratio] of ratios.entries()) {
      rowItems.push({ ratio, index: i })
      const gapSize = (rowItems.length + 1) * ITEM_GAP
      itemsWidth += IDEAL_ROW_HEIGHT * ratio
      if (itemsWidth + gapSize > containerWidth) {
        const sizeMultiplier = Math.min(
          (containerWidth - gapSize) / itemsWidth,
          MAX_SIZE_MULTIPLIER,
        )
        const rowHeight = IDEAL_ROW_HEIGHT * sizeMultiplier
        layoutRows.push({
          items: rowItems,
          height: rowHeight,
          monthId,
          firstRowOfTheMonth,
          lastRowOfTheMonth: i === ratios.length - 1,
          key: `${monthId}-${layoutRows.length}`,
          offsetTop,
        })
        firstRowOfTheMonth = false
        rowItems = []
        itemsWidth = 0
        offsetTop += rowHeight + ITEM_GAP
      }
    }

    if (rowItems.length > 0) {
      const sizeMultiplier = Math.min(containerWidth / itemsWidth, MAX_SIZE_MULTIPLIER)
      const rowHeight = IDEAL_ROW_HEIGHT * sizeMultiplier
      layoutRows.push({
        items: rowItems,
        height: rowHeight,
        monthId,
        firstRowOfTheMonth,
        lastRowOfTheMonth: true,
        key: `${monthId}-${layoutRows.length}`,
        offsetTop,
      })
      offsetTop += rowHeight + ITEM_GAP
    }
  }

  return layoutRows
}

const gridLayout = ref<LayoutRow[]>([])
watch([() => timelineStore.monthRatios, containerSize], () => {
  gridLayout.value = calculateLayout(timelineStore.monthRatios, containerSize.value.width)
})
</script>

<template>
  <div class="timeline-container">
    <main-layout-container>
      <div class="scroll-container" ref="scrollContainer">
        <v-virtual-scroll
          :items="gridLayout"
          :height="containerSize.height"
          class="virtual-scroll"
          item-key="key"
        >
          <template v-slot:default="{ item }">
            <div class="row-date-header" v-if="item.firstRowOfTheMonth">
              <h2>{{ item.monthId }}</h2>
            </div>
            <div
              :class="{
                'first-of-the-month-row': item.firstRowOfTheMonth,
                'last-of-the-month-row': item.lastRowOfTheMonth,
              }"
              class="virtual-scroll-row"
              :style="{
                height: `${Math.round(item.height)}px`,
                width: `${containerSize.width - ITEM_GAP * 2}px`,
              }"
            >
              <div
                v-for="mediaItem in item.items"
                :key="mediaItem.index"
                class="virtual-scroll-item"
                :style="{
                  width: `${Math.round(mediaItem.ratio * item.height)}px`,
                  height: `${item.height}px`,
                }"
              />
            </div>
          </template>
        </v-virtual-scroll>
      </div>
    </main-layout-container>
    <div class="timeline-scroll"></div>
  </div>
</template>

<style scoped>
.timeline-container {
  width: 100%;
  height: 100%;
  display: flex;
}

.scroll-container {
  height: 100%;
}

.virtual-scroll {
  background-color: green;
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.virtual-scroll::-webkit-scrollbar {
  display: none;
}

.virtual-scroll-row {
  display: flex;
  margin-bottom: v-bind(ITEM_GAP_PX);
  margin-left: v-bind(ITEM_GAP_PX);
  margin-right: v-bind(ITEM_GAP_PX);
  gap: v-bind(ITEM_GAP_PX);
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
  padding: 15px 30px;
}
.row-date-header h2 {
  font-size: 30px;
  font-weight: 500;
}

.virtual-scroll-item {
  background-color: rgba(255, 255, 255, 0.3);
}

.timeline-scroll {
  width: 50px;
  height: 100%;
  background-color: red;
}
</style>
