<script setup lang="ts">
import MainLayoutContainer from '@/vues/components/MainLayoutContainer.vue'
import { ref, shallowRef, useTemplateRef, watch } from 'vue'
import { useResizeObserver } from '@vueuse/core'
import type { TimelineMonthRatios } from '@/scripts/types/generated/timeline.ts'
import { useTimelineStore } from '@/scripts/stores/timeline/timelineStore.ts'
import { CURRENT_YEAR, MONTHS } from '@/scripts/constants.ts'

const timelineStore = useTimelineStore()

const containerSize = ref({ width: 0, height: 0 })
const currentMonthId = ref<string | null>(null)
const scrollContainerEl = useTemplateRef('scrollContainer')
const gridLayout = shallowRef<LayoutRow[]>([])

const IDEAL_ROW_HEIGHT = 240
const MAX_SIZE_MULTIPLIER = 1.5
const ITEM_GAP = 5
const ROW_HEADER_HEIGHT = 76

interface LayoutRow {
  items: LayoutRowItem[]
  height: number
  date: Date
  firstOfTheMonth: boolean
  lastOfTheMonth: boolean
  key: string
  offsetTop: number
}

interface LayoutRowItem {
  ratio: number
  index: number
}

function calculateLayout(monthRatios: TimelineMonthRatios[], containerWidth: number) {
  if (monthRatios.length === 0 || containerWidth === 0) return []
  const layoutRows: LayoutRow[] = []
  let offsetTop = 0

  for (const { monthId, ratios } of monthRatios) {
    let firstOfTheMonth = true
    let itemsWidth = 0
    let rowItems: LayoutRowItem[] = []
    offsetTop += ROW_HEADER_HEIGHT

    for (const [i, ratio] of ratios.entries()) {
      rowItems.push({ ratio, index: i })
      const gapSize = (rowItems.length - 1) * ITEM_GAP
      itemsWidth += IDEAL_ROW_HEIGHT * ratio
      if (itemsWidth + gapSize > containerWidth) {
        const sizeMultiplier = Math.min(
          (containerWidth - gapSize) / itemsWidth,
          MAX_SIZE_MULTIPLIER,
        )
        const rowHeight = IDEAL_ROW_HEIGHT * sizeMultiplier
        const lastOfTheMonth = i === ratios.length - 1
        layoutRows.push({
          items: rowItems,
          height: rowHeight,
          date: new Date(monthId),
          firstOfTheMonth,
          lastOfTheMonth,
          key: `${monthId}-${layoutRows.length}`,
          offsetTop,
        })
        firstOfTheMonth = false
        rowItems = []
        itemsWidth = 0
        offsetTop += Math.round(rowHeight)
        if (!lastOfTheMonth) offsetTop += ITEM_GAP
      }
    }

    if (rowItems.length > 0) {
      const sizeMultiplier = Math.min(containerWidth / itemsWidth, MAX_SIZE_MULTIPLIER)
      const rowHeight = IDEAL_ROW_HEIGHT * sizeMultiplier
      layoutRows.push({
        items: rowItems,
        height: rowHeight,
        date: new Date(monthId),
        firstOfTheMonth,
        lastOfTheMonth: true,
        key: `${monthId}-${layoutRows.length}`,
        offsetTop,
      })
      offsetTop += Math.round(rowHeight)
    }
  }

  return layoutRows
}

function onScroll(e: Event) {
  const target = e.target as HTMLElement
  const scrollTop = target.scrollTop
  const rows = gridLayout.value

  if (rows.length === 0) return

  let low = 0
  let high = rows.length - 1
  let index = 0

  while (low <= high) {
    const mid = Math.floor((low + high) / 2)
    const row = rows[mid]!
    const effectiveTop = row.firstOfTheMonth ? row.offsetTop - ROW_HEADER_HEIGHT : row.offsetTop

    if (effectiveTop <= scrollTop) {
      index = mid
      low = mid + 1
    } else {
      high = mid - 1
    }
  }

  const foundDate = rows[index]!.date
  const newMonthId = foundDate.toISOString()

  if (currentMonthId.value !== newMonthId) {
    currentMonthId.value = newMonthId
    console.log('Current Top Month:', MONTHS[foundDate.getMonth()], foundDate.getFullYear())
  }
}

useResizeObserver(scrollContainerEl, (entries) => {
  if (entries[0]) {
    containerSize.value = {
      width: entries[0].contentRect.width,
      height: entries[0].contentRect.height,
    }
  }
})

watch([() => timelineStore.monthRatios, containerSize], () => {
  const now = performance.now()
  const rows = calculateLayout(timelineStore.monthRatios, containerSize.value.width)
  console.log('calculateLayout', performance.now() - now, 'ms')
  gridLayout.value = rows
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
          @scroll.passive="onScroll"
        >
          <template v-slot:default="{ item }">
            <div class="row-date-header" v-if="item.firstOfTheMonth">
              <h2>{{ MONTHS[item.date.getMonth()] }}</h2>
              <h3 v-if="item.date.getFullYear() !== CURRENT_YEAR">{{ item.date.getFullYear() }}</h3>
            </div>
            <div
              :class="{
                'first-of-the-month-row': item.firstOfTheMonth,
                'last-of-the-month-row': item.lastOfTheMonth,
              }"
              :offset-top="item.offsetTop"
              class="virtual-scroll-row"
              :style="{
                height: `${Math.round(item.height) + (item.lastOfTheMonth ? 0 : ITEM_GAP)}px`,
                width: `${containerSize.width}px`,
              }"
            >
              <div
                v-for="mediaItem in item.items"
                :key="mediaItem.index"
                class="virtual-scroll-item"
                :style="{
                  width: `${Math.round(mediaItem.ratio * item.height)}px`,
                  height: `${Math.round(item.height)}px`,
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
  --item-gap: calc(v-bind(ITEM_GAP) * 1px);
}

.scroll-container {
  height: 100%;
}

.virtual-scroll {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.virtual-scroll::-webkit-scrollbar {
  display: none;
}

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
  flex: 0 0 auto; /* do not grow, do not shrink */
  background-color: rgba(255, 255, 255, 0.05);
}

.timeline-scroll {
  width: 50px;
  height: 100%;
  background-color: red;
}
</style>
