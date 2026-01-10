<script setup lang="ts">
import MainLayoutContainer from '@/vues/components/MainLayoutContainer.vue'
import { computed, ref, shallowRef, useTemplateRef, watch } from 'vue'
import { useResizeObserver, useThrottleFn } from '@vueuse/core'
import { useVirtualizer } from '@tanstack/vue-virtual'
import type { TimelineMonthRatios } from '@/scripts/types/generated/timeline.ts'
import { useTimelineStore } from '@/scripts/stores/timeline/timelineStore.ts'
import { requestIdleCallbackAsync } from '@/scripts/utils.ts'
import TimelineRow from '@/vues/components/timeline/TimelineRow.vue'
import type { LayoutRow, LayoutRowItem } from '@/scripts/types/timeline/layout.ts'

const timelineStore = useTimelineStore()

const IDEAL_ROW_HEIGHT = 240
const MAX_SIZE_MULTIPLIER = 1.5
const ITEM_GAP = 2
const ROW_HEADER_HEIGHT = 76
const THUMBNAIL_SIZES = [144, 240, 360, 480, 720, 1080, 1440]
const MIN_SCROLL_THUMB_HEIGHT = 20
const SCROLL_PROTRUSION_HEIGHT = 4

const containerSize = shallowRef({ width: 0, height: 0 })
const scrollTrackSize = shallowRef({ width: 0, height: 0 })
const currentScrollTop = ref(0)
const dateInView = ref<Date | null>(null)
const scrollContainerEl = useTemplateRef('scrollContainer')
const scrollTrackEl = useTemplateRef('scrollTrack')
const gridLayout = shallowRef<LayoutRow[]>([])
const scrollHeight = ref(0)
const virtualizerOptions = computed(() => ({
  count: gridLayout.value.length,
  getScrollElement: () => scrollContainerEl.value,
  estimateSize: (index: number) => {
    const row = gridLayout.value[index]
    if (!row) return 0

    let size = row.height
    if (row.firstOfTheMonth) size += ROW_HEADER_HEIGHT
    if (!row.lastOfTheMonth) size += ITEM_GAP

    return size
  },
  overscan: 5,
}))
const rowVirtualizer = useVirtualizer(virtualizerOptions)
const scrollThumbHeight = computed(() =>
  Math.max(
    (scrollTrackSize.value.height * containerSize.value.height) / scrollHeight.value,
    MIN_SCROLL_THUMB_HEIGHT,
  ),
)
const scrollPercentage = computed(() => {
  if (scrollHeight.value <= containerSize.value.height) return 0
  const maxScrollTop = scrollHeight.value - containerSize.value.height
  return Math.min(Math.max(currentScrollTop.value / maxScrollTop, 0), 1)
})
const scrollLabels = shallowRef<{
  years: YearScrollLabel[]
  months: MonthScrollLabel[]
  totalHeight: number
}>({
  years: [],
  months: [],
  totalHeight: 0,
})
const visibleYearLabels = computed(() => {
  const years = scrollLabels.value.years
  const YEAR_LABEL_HEIGHT = 20
  const yearYs: [number, number][] = []
  for (const year of years) {
    const yearY = Math.min(
      scrollTrackSize.value.height - YEAR_LABEL_HEIGHT,
      Math.max(
        0,
        ((scrollTrackSize.value.height - 5) * year.endOfYearOffsetTop) /
          scrollLabels.value.totalHeight -
          YEAR_LABEL_HEIGHT + SCROLL_PROTRUSION_HEIGHT,
      ),
    )
    yearYs.push([year.year, yearY])
  }

  if (yearYs.length === 0) return []

  const result: [number, number][] = []
  result.push(yearYs[0]!)

  let prevY = yearYs.length > 0 ? yearYs[0]![1] : 0
  for (const [year, y] of yearYs.slice(1, yearYs.length - 1)) {
    const distToPrevLabel = y - prevY
    if (distToPrevLabel > YEAR_LABEL_HEIGHT) {
      result.push([year, y])
      prevY = y
    }
  }
  if (yearYs.length > 1) result.push(yearYs[yearYs.length - 1]!)
  return result
})

let monthPreloadAbortSignal = { aborted: false }
let allMonthsPreloaded = false

interface YearScrollLabel {
  year: number
  startOfYearOffsetTop: number
  endOfYearOffsetTop: number
}

interface MonthScrollLabel {
  monthId: string
  offsetTop: number
}

function getThumbnailHeight(rowHeight: number) {
  for (const size of THUMBNAIL_SIZES) {
    if (size > rowHeight) return size
  }
  return THUMBNAIL_SIZES[THUMBNAIL_SIZES.length - 1]!
}

function calculateLayout(
  monthRatios: TimelineMonthRatios[],
  containerWidth: number,
  sort: 'desc' | 'asc',
) {
  if (monthRatios.length === 0 || containerWidth === 0)
    return { rows: [], scrollMonths: [], scrollYears: [], totalHeight: 0 }
  console.log(monthRatios)
  const layoutRows: LayoutRow[] = []
  const monthScrollLabels: MonthScrollLabel[] = []
  const yearScrollLabels: YearScrollLabel[] = []
  let activeYear: YearScrollLabel | null = null
  let offsetTop = 0

  for (const { monthId, ratios } of monthRatios) {
    const year = +monthId.substring(0, 4)
    if (
      activeYear === null ||
      (sort === 'desc' && year < activeYear.year) ||
      (sort === 'asc' && year > activeYear.year)
    ) {
      if (activeYear) {
        activeYear.endOfYearOffsetTop = offsetTop
        yearScrollLabels.push(activeYear)
      }
      activeYear = {
        year,
        startOfYearOffsetTop: offsetTop,
        endOfYearOffsetTop: -1,
      }
    }
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
          monthId,
          firstOfTheMonth,
          lastOfTheMonth,
          key: `${monthId}-${layoutRows.length}`,
          offsetTop,
          thumbnailSize: getThumbnailHeight(rowHeight),
        })
        if (firstOfTheMonth) {
          monthScrollLabels.push({
            monthId,
            offsetTop,
          })
        }
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
        monthId,
        firstOfTheMonth,
        lastOfTheMonth: true,
        key: `${monthId}-${layoutRows.length}`,
        offsetTop,
        thumbnailSize: getThumbnailHeight(rowHeight),
      })
      if (firstOfTheMonth) {
        monthScrollLabels.push({
          monthId,
          offsetTop,
        })
      }
      offsetTop += Math.round(rowHeight)
    }
  }

  if (activeYear) {
    activeYear.endOfYearOffsetTop = offsetTop
    yearScrollLabels.push(activeYear)
  }
  return {
    rows: layoutRows,
    scrollMonths: monthScrollLabels,
    scrollYears: yearScrollLabels,
    totalHeight: offsetTop,
  }
}

function dateFromScrollTop(rows: LayoutRow[], scrollTop: number) {
  if (rows.length === 0) return null

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

  return rows[index]?.date ?? null
}

const onScroll = useThrottleFn(rawOnScroll, 33)

function rawOnScroll(e: Event) {
  const target = e.target as HTMLElement
  scrollHeight.value = target.scrollHeight
  currentScrollTop.value = target.scrollTop
  const date = dateFromScrollTop(gridLayout.value, currentScrollTop.value)
  if (date === null) {
    dateInView.value = null
    return
  }
  const current = dateInView.value
  if (
    current === null ||
    current.getFullYear() !== date.getFullYear() ||
    current.getMonth() !== date.getMonth() ||
    current.getDate() !== date.getDate()
  ) {
    dateInView.value = date
  }
}

async function preLoadAllMonths(
  monthRatios: TimelineMonthRatios[],
  date: Date,
  abortSignal: { aborted: boolean },
) {
  const currentMonthIndex = monthRatios.findIndex(
    ({ monthId }) => monthId === date.toISOString().substring(0, 10),
  )
  let i = 0
  let monthIdsToFetch: string[] = []
  let countToFetch = 0
  const BATCH_SIZE = 500
  while (true) {
    i++
    const beforeIndex = currentMonthIndex - i
    const afterIndex = currentMonthIndex + i
    const fetchMonthRatios: TimelineMonthRatios[] = []

    if (beforeIndex >= 0) fetchMonthRatios.push(monthRatios[beforeIndex]!)
    if (afterIndex < monthRatios.length) fetchMonthRatios.push(monthRatios[afterIndex]!)

    for (const { monthId, count } of fetchMonthRatios) {
      monthIdsToFetch.push(monthId)
      countToFetch += count
    }

    if (
      countToFetch > BATCH_SIZE ||
      (fetchMonthRatios.length === 0 && monthIdsToFetch.length > 0)
    ) {
      await requestIdleCallbackAsync(() => timelineStore.fetchMediaByMonth(monthIdsToFetch))
      countToFetch = 0
      monthIdsToFetch = []
    }

    if (fetchMonthRatios.length === 0 || abortSignal.aborted) {
      if (abortSignal.aborted) {
        console.warn('ABORTED')
      } else {
        console.log('Fetched all media by month')
        allMonthsPreloaded = true
      }
      break
    }
  }
}

function abortMonthPreload() {
  monthPreloadAbortSignal.aborted = true
  monthPreloadAbortSignal = { aborted: false }
  return monthPreloadAbortSignal
}

useResizeObserver(scrollContainerEl, (entries) => {
  if (entries[0]) {
    containerSize.value = {
      width: entries[0].contentRect.width,
      height: entries[0].contentRect.height,
    }
  }
})

useResizeObserver(scrollTrackEl, (entries) => {
  if (entries[0]) {
    scrollTrackSize.value = {
      width: entries[0].contentRect.width,
      height: entries[0].contentRect.height,
    }
  }
})

watch([() => timelineStore.monthRatios, containerSize], () => {
  const now = performance.now()
  const { rows, scrollYears, scrollMonths, totalHeight } = calculateLayout(
    timelineStore.monthRatios,
    containerSize.value.width,
    'desc',
  )
  console.log('calculateLayout', performance.now() - now, 'ms')
  scrollLabels.value = {
    months: scrollMonths,
    years: scrollYears,
    totalHeight,
  }
  gridLayout.value = rows
  scrollHeight.value = totalHeight

  if (dateInView.value === null && gridLayout.value.length > 0) {
    dateInView.value = dateFromScrollTop(gridLayout.value, 0)
  }
})

watch(
  dateInView,
  () => {
    const date = dateInView.value
    if (!date) return
    console.log('dateInView', date.toISOString().substring(0, 7))
    if (!allMonthsPreloaded) preLoadAllMonths(timelineStore.monthRatios, date, abortMonthPreload())
  },
  { immediate: true },
)
</script>

<template>
  <div class="timeline-container">
    <main-layout-container>
      <div class="scroll-container" ref="scrollContainer" @scroll.passive="onScroll">
        <div
          :style="{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }"
        >
          <div
            v-for="virtualRow in rowVirtualizer.getVirtualItems()"
            :key="String(virtualRow.key)"
            :style="{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualRow.start}px)`,
            }"
          >
            <timeline-row
              v-if="gridLayout[virtualRow.index]"
              :item="gridLayout[virtualRow.index]!"
              :container-width="containerSize.width"
              :item-gap="ITEM_GAP"
            />
          </div>
        </div>
      </div>
    </main-layout-container>

    <div class="timeline-scroll" ref="scrollTrack">
      <div class="scroll-track"></div>
      <div
        class="scroll-thumb"
        :style="{
          height: `${scrollThumbHeight}px`,
          transform: `translateY(${Math.min(scrollTrackSize.height - scrollThumbHeight, Math.max(0, scrollPercentage * (scrollTrackSize.height - SCROLL_PROTRUSION_HEIGHT) + SCROLL_PROTRUSION_HEIGHT / 2 - scrollThumbHeight / 2))}px)`,
        }"
      ></div>
      <div
        class="scroll-protrusion"
        :style="{
          transform: `translateY(${scrollPercentage * (scrollTrackSize.height - SCROLL_PROTRUSION_HEIGHT)}px)`,
        }"
      ></div>
      <div class="scroll-labels">
        <div class="year-labels">
          <div
            class="year-label"
            v-for="[year, y] in visibleYearLabels"
            :key="year"
            :style="{
              transform: `translateY(${y}px)`,
            }"
          >
            {{ year }}
          </div>
        </div>
        <div class="month-dots">
          <div
            class="month-dot"
            v-for="monthLabel in scrollLabels.months"
            :key="monthLabel.monthId"
            :style="{
              transform: `translateY(${Math.max(0, ((scrollTrackSize.height - 4) * monthLabel.offsetTop) / scrollLabels.totalHeight)}px)`,
            }"
          ></div>
        </div>
      </div>
    </div>
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
  overflow-y: auto;
  width: 100%;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.scroll-container::-webkit-scrollbar {
  display: none;
}

.timeline-scroll {
  width: 50px;
  height: 100%;
  position: relative;
}

.scroll-track {
  background-color: rgba(var(--v-theme-on-surface), 0.08);
  width: 7px;
  height: 100%;
  position: absolute;
  right: 3px;
  top: 0;
}

.scroll-thumb {
  background-color: rgb(var(--v-theme-primary));
  position: absolute;
  top: 0;
  right: 3px;
  width: 7px;
  border-radius: 5px;
}

.scroll-protrusion {
  background-color: rgb(var(--v-theme-primary));
  height: calc(v-bind(SCROLL_PROTRUSION_HEIGHT) * 1px);
  width: calc(100% - 3px - 5px);
  position: absolute;
  top: 0;
  left: 5px;
  border-top-left-radius: 2px;
  border-top-right-radius: 2px;
}

.scroll-thumb,
.scroll-protrusion {
  will-change: transform;
  transform: translateZ(0);
  backface-visibility: hidden;
}

.scroll-labels {
  position: absolute;
  top: 0;
  right: 0;
  pointer-events: none;
}

.year-labels {
  position: relative;
  top: 0;
  right: 10px;
}

.year-label {
  background-color: rgba(var(--v-theme-on-surface), 0.08);
  color: rgba(var(--v-theme-on-surface), 0.8);
  position: absolute;
  top: 0;
  right: 0;
  font-size: 12px;
  padding: 0 5px;
  border-top-left-radius: 10px;
  border-bottom-left-radius: 10px;
}

.month-dots {
  position: absolute;
  top: 0;
  right: 4px;
}

.month-dot {
  position: absolute;
  top: 0;
  right: 0;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background-color: rgba(var(--v-theme-secondary), 0.2);
}
</style>
