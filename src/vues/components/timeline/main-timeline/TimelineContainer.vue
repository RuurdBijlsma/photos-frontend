<script setup lang="ts">
import MainLayoutContainer from '@/vues/components/MainLayoutContainer.vue'
import { computed, ref, shallowRef, useTemplateRef, watch } from 'vue'
import { useDebounceFn, useEventListener, useResizeObserver, useThrottleFn } from '@vueuse/core'
import { useVirtualizer } from '@tanstack/vue-virtual'
import type { TimelineMonthRatios } from '@/scripts/types/generated/timeline.ts'
import { useTimelineStore } from '@/scripts/stores/timeline/timelineStore.ts'
import { getThumbnailHeight, requestIdleCallbackAsync } from '@/scripts/utils.ts'
import type { LayoutRow, LayoutRowItem } from '@/scripts/types/timeline/layout.ts'
import { MONTHS } from '@/scripts/constants.ts'
import { useSelectionStore } from '@/scripts/stores/timeline/selectionStore.ts'
import VirtualRow from '@/vues/components/timeline/main-timeline/VirtualRow.vue'
import SelectionOverlay from '@/vues/components/timeline/timeline-components/SelectionOverlay.vue'
import DateOverlay from '@/vues/components/timeline/timeline-components/DateOverlay.vue'
import { useRoute } from 'vue-router'
import timelineService from '@/scripts/services/timelineService.ts'
import { useViewPhotoStore } from '@/scripts/stores/timeline/viewPhotoStore.ts'

const timelineStore = useTimelineStore()
const selectionStore = useSelectionStore()
const viewPhotoStore = useViewPhotoStore()
const route = useRoute()

const IDEAL_ROW_HEIGHT = 240
const MAX_SIZE_MULTIPLIER = 1.5
const ITEM_GAP = 2
const ROW_HEADER_HEIGHT = 76
const MIN_SCROLL_THUMB_HEIGHT = 20
const SCROLL_PROTRUSION_HEIGHT = 4

const containerSize = shallowRef({ width: 0, height: 0 })
const scrollTrackHeight = shallowRef(0)
const currentScrollTop = ref(0)
const rowInView = computed(() => layoutRowFromScrollTop(gridLayout.value, currentScrollTop.value))
const monthInView = computed(() => rowInView.value?.date ?? null)
const mediaItemInView = computed(
  () =>
    timelineStore.monthItems.get(rowInView.value?.monthId ?? '')?.[
      rowInView.value?.items[0]?.index ?? -1
    ] ?? null,
)
const mediaItemInViewDate = computed(() =>
  mediaItemInView.value?.timestamp ? new Date(mediaItemInView.value.timestamp) : null,
)
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
    (scrollTrackHeight.value * containerSize.value.height) / scrollHeight.value,
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
const tooltipDate = ref<Date | null>(null)
const tooltipY = ref(0)
const formattedTooltipLabel = computed(() => {
  if (!tooltipDate.value) return ''
  const d = tooltipDate.value
  const monthName = MONTHS[d.getMonth()]?.substring(0, 3) ?? ''
  return `${monthName} ${d.getFullYear()}`
})
const showScrollDetails = ref(false)
const isScrollingFast = ref(false)
const visibleYearLabels = computed(() => {
  const years = scrollLabels.value.years
  const YEAR_LABEL_HEIGHT = 20
  const yearYs: [number, number][] = []
  for (const year of years) {
    const yearY = Math.min(
      scrollTrackHeight.value - YEAR_LABEL_HEIGHT,
      Math.max(
        0,
        ((scrollTrackHeight.value - 5) * year.endOfYearOffsetTop) / scrollLabels.value.totalHeight -
          YEAR_LABEL_HEIGHT +
          SCROLL_PROTRUSION_HEIGHT,
      ),
    )
    yearYs.push([year.year, yearY])
  }

  if (yearYs.length === 0) return []

  const result: [number, number][] = []
  result.push(yearYs[0]!)

  let prevY = yearYs.length > 0 ? yearYs[0]![1] : 0
  for (let i = 1; i < yearYs.length - 1; i++) {
    const [year, y] = yearYs[i]!
    const distToPrevLabel = y - prevY
    if (i === yearYs.length - 2) {
      // Second to last label, might conflict with last label that's always present
      const lastY = yearYs[yearYs.length - 1]![1]
      const distToNextLabel = lastY - y
      if (distToNextLabel < YEAR_LABEL_HEIGHT) continue
    }
    if (distToPrevLabel > YEAR_LABEL_HEIGHT) {
      result.push([year, y])
      prevY = y
    }
  }
  if (yearYs.length > 1) result.push(yearYs[yearYs.length - 1]!)
  return result
})
const overlayDate = computed(() => {
  if (currentScrollTop.value < 600) return null
  if (selectionStore.hoverDate === null || isScrollingFast.value) return mediaItemInViewDate.value
  return new Date(selectionStore.hoverDate)
})

let monthPreloadAbortSignal = { aborted: false }
let allMonthsPreloaded = false
let isScrollDragging = false

interface YearScrollLabel {
  year: number
  startOfYearOffsetTop: number
  endOfYearOffsetTop: number
}

interface MonthScrollLabel {
  monthId: string
  offsetTop: number
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

function layoutRowFromScrollTop(rows: LayoutRow[], scrollTop: number) {
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

  return rows[index] ?? null
}

function rawOnScroll(e: Event) {
  const target = e.target as HTMLElement
  scrollHeight.value = target.scrollHeight
  currentScrollTop.value = target.scrollTop
}
const onScroll = useThrottleFn(rawOnScroll, 33)

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
        console.warn('ABORTED prefetch')
      } else {
        console.log('Fetched all media by month')
        allMonthsPreloaded = true
        selectionStore.allIds = timelineStore.mediaItemIds
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

function updateScrollPosition(clientY: number) {
  if (!scrollTrackEl.value || !scrollContainerEl.value || !isScrollDragging) return
  const trackRect = scrollTrackEl.value.getBoundingClientRect()
  const trackHeight = trackRect.height
  const relativeY = Math.max(0, Math.min(clientY - trackRect.top, trackHeight))
  const percentage = relativeY / trackHeight
  const maxScrollTop = scrollHeight.value - containerSize.value.height
  if (maxScrollTop > 0) {
    const newScrollTop = percentage * maxScrollTop
    scrollContainerEl.value.scrollTop = newScrollTop
    currentScrollTop.value = newScrollTop
  }
}

function updateTooltipPosition(clientY: number) {
  if (!scrollTrackEl.value || !scrollContainerEl.value) return
  const trackRect = scrollTrackEl.value.getBoundingClientRect()
  const trackHeight = trackRect.height
  const relativeY = Math.max(0, Math.min(clientY - trackRect.top, trackHeight))
  const percentage = relativeY / trackHeight
  const scrollTop = percentage * (scrollHeight.value - containerSize.value.height)
  const rowInView = layoutRowFromScrollTop(gridLayout.value, scrollTop)
  tooltipDate.value = rowInView?.date ?? null
  tooltipY.value = relativeY
}

function handleTooltipMove(e: MouseEvent) {
  updateTooltipPosition(e.clientY)
}

function handleMouseDown(e: MouseEvent) {
  e.preventDefault()
  isScrollDragging = true
  updateScrollPosition(e.clientY)
}

async function fetchViewPhotoIds() {
  const response = await timelineService.getTimelineIds()
  viewPhotoStore.ids = response.data
}

async function initializeViewPhoto() {
  viewPhotoStore.viewLink = '/view/'

  if (route.name!.toString().startsWith('view-photo')) {
    await fetchViewPhotoIds()
  } else {
    await requestIdleCallbackAsync(fetchViewPhotoIds)
  }
}

initializeViewPhoto()

useResizeObserver(scrollContainerEl, (entries) => {
  if (entries[0]) {
    const contentRect = entries[0].contentRect
    containerSize.value = {
      width: contentRect.width,
      height: contentRect.height,
    }
  }
})

useResizeObserver(scrollTrackEl, (entries) => {
  if (entries[0]) scrollTrackHeight.value = entries[0].contentRect.height
})

useEventListener(document, 'mousemove', (e) => {
  if (!isScrollDragging) return
  updateScrollPosition(e.clientY)
})

useEventListener(document, 'mouseup', (e) => {
  isScrollDragging = false
  updateScrollPosition(e.clientY)
})

const hideScrollDetails = useDebounceFn(() => {
  showScrollDetails.value = false
}, 5000)

const stopScrollingFast = useDebounceFn(() => {
  isScrollingFast.value = false
}, 150)

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
})

watch(
  monthInView,
  (newVal, oldVal) => {
    if (oldVal && newVal) {
      const newIso = newVal.toISOString().substring(0, 10)
      const oldIso = oldVal.toISOString().substring(0, 10)
      if (newIso === oldIso) return
    }
    const date = monthInView.value
    if (!date) return
    console.log('monthInView', date.toISOString().substring(0, 7))
    if (!allMonthsPreloaded) preLoadAllMonths(timelineStore.monthRatios, date, abortMonthPreload())
  },
  { immediate: true },
)

watch(currentScrollTop, (newVal, oldVal) => {
  showScrollDetails.value = true
  hideScrollDetails()

  const scrollDelta = Math.abs(newVal - oldVal)
  if (scrollDelta > 750) {
    if (!isScrollingFast.value) {
      isScrollingFast.value = true
    }
    stopScrollingFast()
  } else if (isScrollingFast.value && scrollDelta > 300) stopScrollingFast()
})
</script>

<template>
  <div class="timeline-container">
    <main-layout-container>
      <selection-overlay />
      <date-overlay :date="overlayDate" />
      <teleport to="body">
        <router-view />
      </teleport>
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
            <virtual-row
              v-if="gridLayout[virtualRow.index]"
              :item="gridLayout[virtualRow.index]!"
              :container-width="containerSize.width"
              :item-gap="ITEM_GAP"
              :is-scrolling-fast="isScrollingFast"
            />
          </div>
        </div>
      </div>
    </main-layout-container>

    <div
      class="timeline-scroll"
      ref="scrollTrack"
      @mousedown="handleMouseDown"
      @mousemove="handleTooltipMove"
      @mouseleave="tooltipDate = null"
    >
      <div class="scroll-track"></div>
      <div
        class="scroll-thumb"
        :style="{
          transform: `translateY(${Math.min(scrollTrackHeight - scrollThumbHeight, Math.max(0, scrollPercentage * (scrollTrackHeight - SCROLL_PROTRUSION_HEIGHT) + SCROLL_PROTRUSION_HEIGHT / 2 - scrollThumbHeight / 2))}px)`,
        }"
      ></div>
      <div
        class="scroll-protrusion-parent"
        :style="{
          transform: `scaleX(${showScrollDetails || tooltipDate ? 1 : 0})`,
        }"
      >
        <div
          class="scroll-protrusion"
          :style="{
            transform: `translateY(${scrollPercentage * (scrollTrackHeight - SCROLL_PROTRUSION_HEIGHT)}px)`,
          }"
        ></div>
      </div>

      <div
        class="scroll-tooltip"
        v-if="tooltipDate"
        :style="{
          transform: `translateY(${tooltipY}px)`,
        }"
      >
        <div class="tooltip-content">
          <span class="tooltip-text">{{ formattedTooltipLabel }}</span>
          <div class="tooltip-line"></div>
        </div>
      </div>

      <div
        class="scroll-labels"
        :style="{
          opacity: showScrollDetails || tooltipDate ? 1 : 0,
        }"
      >
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
              transform: `translateY(${Math.max(0, ((scrollTrackHeight - 4) * monthLabel.offsetTop) / scrollLabels.totalHeight)}px)`,
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
  cursor: none;
}

.scroll-track {
  background-color: rgba(var(--v-theme-on-surface), 0.08);
  width: 7px;
  height: 100%;
  position: absolute;
  right: 3px;
  top: 0;
  pointer-events: none;
}

.scroll-thumb {
  background-color: rgb(var(--v-theme-primary));
  position: absolute;
  top: 0;
  right: 3px;
  width: 7px;
  border-radius: 5px;
  height: calc(v-bind(scrollThumbHeight) * 1px);
}

.scroll-protrusion-parent {
  transform-origin: right;
  transition: transform 0.1s ease-in-out;
  position: absolute;
  top: 0;
  right: 3px;
  width: calc(100% - 3px - 5px);
}

.scroll-protrusion {
  background-color: rgb(var(--v-theme-primary));
  height: calc(v-bind(SCROLL_PROTRUSION_HEIGHT) * 1px);
  border-top-left-radius: 2px;
  border-top-right-radius: 2px;
  width: 100%;
}

.scroll-thumb,
.scroll-protrusion,
.scroll-tooltip {
  will-change: transform;
  transform: translateZ(0);
  backface-visibility: hidden;
  pointer-events: none;
}

.scroll-tooltip {
  position: absolute;
  right: 0;
  width: 0;
  height: 0;
  overflow: visible;
  z-index: 10;
  top: 0;
}

.tooltip-content {
  position: absolute;
  top: 0;
  right: 0;
}

.tooltip-text {
  position: absolute;
  right: 3px;
  bottom: 5px;
  font-family: 'Montserrat', Arial, sans-serif;
  font-size: 10px;
  font-weight: 600;
  color: rgb(var(--v-theme-on-primary));
  background-color: rgb(var(--v-theme-primary));
  padding: 4px 8px;
  border-radius: 8px 0 0 8px;
  white-space: nowrap;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.tooltip-line {
  position: absolute;
  right: 3px;
  top: 0;
  width: 40px;
  height: 2px;
  background-color: rgb(var(--v-theme-primary));
  border-radius: 2px 0 0 2px;
  opacity: 0.8;
  transform: translateY(-50%);
}

.scroll-labels {
  position: absolute;
  top: 0;
  right: 0;
  pointer-events: none;
  transition: opacity 0.2s ease-in-out;
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
