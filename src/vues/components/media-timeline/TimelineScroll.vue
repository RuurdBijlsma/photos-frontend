<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, shallowRef, watch } from 'vue'
import { MONTHS } from '@/scripts/constants.ts'
import { useTimelineScroll } from '@/scripts/composables/photo-grid/useTimelineScroll.ts'
import type { TimelineMonthRatios } from '@/scripts/types/generated/timeline.ts'
import type { SortDirection } from '@/scripts/types/api/album.ts'

// --- Props ---
const props = withDefaults(
  defineProps<{
    months: TimelineMonthRatios[] | undefined | null
    sortDirection?: SortDirection
  }>(),
  {
    sortDirection: 'desc',
  },
)

// --- Timeline Scroll Composable ---
const { dateInView, requestScrollToDate, isAtTop } = useTimelineScroll()

// --- Refs ---
const containerRef = ref<HTMLElement | null>(null)
const containerHeight = ref(500) // Default fallback
const hovering = shallowRef(false)
const hoverY = shallowRef(0)
const isScrolling = ref(false)
const isDragging = ref(false)
let scrollTimeout: number | null = null

// --- Config ---
const PADDING = { top: 10, bottom: 20, horizontal: 5 }
const FONT_SIZE = 12
const MIN_YEAR_SPACING = FONT_SIZE + 10

// --- State ---
// We use a map for O(1) access for the thumb position and layout
type MonthLayout = {
  start: number // The normalized Y start (0-1)
  height: number // The height of this month segment (0-1)
  label: string // The formatted label for this month
  year: number
  month: number
}

// --- Helpers ---
const getMonthKey = (date: Date) => `${date.getFullYear()}-${date.getMonth() + 1}`
const parseMonthId = (monthId: string) => {
  const [year, month, day] = monthId.split('-').map(Number)
  return { year: year ?? 0, month: month ?? 0, day: day ?? 0 }
}

// Coordinate transformations
const toPixels = (normY: number, containerH: number) => {
  return PADDING.top + normY * (containerH - (PADDING.top + PADDING.bottom))
}

const toNormalized = (pixelY: number, containerH: number) => {
  const effectiveHeight = containerH - (PADDING.top + PADDING.bottom)
  if (effectiveHeight <= 0) return 0
  const normY = (pixelY - PADDING.top) / effectiveHeight
  return Math.max(0, Math.min(1, normY))
}

// --- Computed Layout Data ---
const layoutData = computed(() => {
  const items = props.months
  const map = new Map<string, MonthLayout>()
  const months: MonthLayout[] = []
  const years: { label: string; y: number }[] = []

  if (!items || items.length === 0) {
    return { map, months, years, thumbHeightRatio: 0.01 }
  }

  const totalCount = items.reduce((acc, m) => acc + m.count, 0)
  const yearTotals: Record<number, number> = {}

  for (const it of items) {
    const d = parseMonthId(it.monthId)
    yearTotals[d.year] = (yearTotals[d.year] || 0) + it.count
  }

  let cumulative = 0
  let lastYear = -1

  for (const item of items) {
    const d = parseMonthId(item.monthId)
    const count = item.count

    // --- Month Positions Construction ---
    const start = cumulative / totalCount
    const height = count / totalCount
    const key = `${d.year}-${d.month}`
    const label = `${MONTHS[d.month - 1]?.substring(0, 3) ?? ''} ${d.year}`

    const layout: MonthLayout = { start, height, label, year: d.year, month: d.month }
    map.set(key, layout)
    months.push(layout)

    // --- Visual State Construction ---
    if (d.year !== lastYear) {
      const yearTotal = yearTotals[d.year] || 0
      const yForYear = (cumulative + yearTotal) / totalCount
      years.push({ label: String(d.year), y: yForYear })
      lastYear = d.year
    }

    cumulative += count
  }

  const approxItemsPerPage = 15
  const thumbHeightRatio = Math.max(approxItemsPerPage / (totalCount || 1), 0.01)

  return { map, months, years, thumbHeightRatio }
})

// --- Computed Layouts ---

// 1. Month Dots (Pure CSS positioning)
const monthDots = computed(() => {
  return layoutData.value.months.map((m) => {
    const endY = m.start + m.height
    return {
      style: {
        top: `calc(${PADDING.top}px + ${endY} * (100% - ${PADDING.top + PADDING.bottom}px))`,
      },
    }
  })
})

// 2. Years (Requires collision detection based on pixel height)
const visibleYears = computed(() => {
  const height = containerHeight.value
  const years = layoutData.value.years
  const result: { label: string; style: { [key: string]: string } }[] = []

  let prevY = -Infinity

  for (let i = 0; i < years.length; i++) {
    const { label, y } = years[i]!
    const targetY = toPixels(y, height)

    if (i > 0 && targetY - prevY < MIN_YEAR_SPACING && i !== years.length - 1) {
      continue
    }

    let finalY = targetY
    if (i > 0) {
      const diff = targetY - prevY
      if (diff < MIN_YEAR_SPACING) {
        finalY += MIN_YEAR_SPACING - diff
      }
    }

    prevY = finalY
    result.push({
      label,
      style: {
        top: `${finalY}px`,
      },
    })
  }
  return result
})

// 3. Thumb Position
const thumbStyle = computed(() => {
  const { map, thumbHeightRatio } = layoutData.value

  if (map.size === 0) return { display: 'none' }

  const height = containerHeight.value
  const effectiveHeight = height - (PADDING.top + PADDING.bottom)
  const thumbHeightPx = thumbHeightRatio * effectiveHeight

  let targetCenterY: number

  if (isDragging.value) {
    const minY = PADDING.top
    const maxY = PADDING.top + effectiveHeight
    targetCenterY = Math.max(minY, Math.min(maxY, hoverY.value))
  } else {
    const date = dateInView.value
    if (!date) return { display: 'none' }
    const normY = getNormYFromDate(date)
    targetCenterY = isAtTop.value ? PADDING.top : toPixels(normY, height)
  }

  // Center the thumb on the target Y
  const translateY = targetCenterY - thumbHeightPx / 2

  return {
    height: `${thumbHeightPx}px`,
    top: '0px',
    transform: `translateY(${translateY}px) translateZ(0)`,
  }
})

// 4. Hover Tooltip
const hoverDateLabel = computed(() => {
  if (!hovering.value && !isDragging.value) return ''

  const normY = toNormalized(hoverY.value, containerHeight.value)
  const months = layoutData.value.months

  for (const m of months) {
    const endY = m.start + m.height
    if (endY >= normY) {
      return m.label
    }
  }

  return months[months.length - 1]?.label ?? ''
})

const tooltipStyle = computed(() => {
  const height = containerHeight.value
  const effectiveHeight = height - (PADDING.top + PADDING.bottom)
  const minY = PADDING.top
  const maxY = PADDING.top + effectiveHeight
  const clampedY = Math.max(minY, Math.min(maxY, hoverY.value))

  return {
    transform: `translateY(${clampedY}px) translateZ(0)`,
  }
})

const trackStyle = computed(() => ({
  top: `${PADDING.top}px`,
  height: `calc(100% - ${PADDING.top + PADDING.bottom}px)`,
}))

// --- Watchers ---
watch(dateInView, () => {
  isScrolling.value = true
  if (scrollTimeout) clearTimeout(scrollTimeout)
  scrollTimeout = window.setTimeout(() => {
    isScrolling.value = false
  }, 3000)
})

// --- Resize Observer ---
let ro: ResizeObserver | null = null

onMounted(() => {
  if (containerRef.value) {
    ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        containerHeight.value = entry.contentRect.height
      }
    })
    ro.observe(containerRef.value)
    // Initial set
    containerHeight.value = containerRef.value.clientHeight
  }
})

onUnmounted(() => {
  if (ro) ro.disconnect()
})

function handleMouseMove(e: MouseEvent) {
  if (!containerRef.value) return
  const rect = containerRef.value.getBoundingClientRect()
  hoverY.value = e.clientY - rect.top

  // If dragging, emit scroll event with interpolated date
  if (isDragging.value) {
    const date = getDateFromY(hoverY.value)
    if (date) {
      requestScrollToDate(date)
    }
  }
}

function handleMouseDown(e: MouseEvent) {
  isDragging.value = true
  handleMouseMove(e)

  // Add document-wide listeners
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
}

function handleMouseUp() {
  isDragging.value = false

  // Remove document-wide listeners
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', handleMouseUp)
}

function getNormYFromDate(date: Date): number {
  const map = layoutData.value.map
  if (map.size === 0) return 0

  const key = getMonthKey(date)
  const data = map.get(key)
  if (!data) return 0

  const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  let dayRatio = Math.min(1, date.getDate() / daysInMonth)
  if (props.sortDirection === 'desc') dayRatio = 1 - dayRatio
  return data.start + data.height * dayRatio
}

function getDateFromNormY(normY: number): Date | null {
  const months = layoutData.value.months
  if (months.length === 0) return null

  // Iterate array to find the segment
  for (const data of months) {
    const endY = data.start + data.height
    if (normY >= data.start && normY <= endY) {
      const { year, month } = data // 1-based month

      const monthStart = new Date(year, month - 1, 1)
      const monthEnd = new Date(year, month, 0)
      monthEnd.setHours(23, 59, 59)

      // Interpolate
      const relativeY = (normY - data.start) / data.height

      const start = monthStart.getTime()
      const end = monthEnd.getTime()
      let time: number

      if (props.sortDirection === 'asc') {
        time = start + (end - start) * relativeY
      } else {
        time = end - (end - start) * relativeY
      }
      return new Date(time)
    }
  }
  return null
}

function getDateFromY(y: number): Date | null {
  const normY = toNormalized(y, containerHeight.value)
  return getDateFromNormY(normY)
}
</script>

<template>
  <div
    ref="containerRef"
    class="timeline-container"
    @mouseenter="hovering = true"
    @mouseleave="hovering = false"
    @mousemove="handleMouseMove"
    @mousedown="handleMouseDown"
  >
    <!-- Track -->
    <div class="timeline-track" :style="trackStyle"></div>

    <!-- Month Dots -->
    <div class="dots-layer" :class="{ visible: hovering || isScrolling || isDragging }">
      <div v-for="(dot, i) in monthDots" :key="i" class="month-dot" :style="dot.style"></div>
    </div>

    <!-- Years -->
    <div class="years-layer" :class="{ visible: hovering || isScrolling || isDragging }">
      <div
        v-for="(year, i) in visibleYears"
        :key="i"
        class="year-item"
        :class="{ 'is-hovering': hovering }"
        :style="year.style"
      >
        {{ year.label }}
      </div>
    </div>

    <!-- Scroll Thumb -->
    <div
      class="scroll-thumb"
      :class="{
        'is-protruded': isScrolling || hovering || isDragging,
        'is-dragging': isDragging,
      }"
      :style="thumbStyle"
    ></div>

    <!-- Hover Tooltip -->
    <div v-show="hovering || isDragging" class="timeline-tooltip" :style="tooltipStyle">
      <div class="tooltip-content">
        <span class="tooltip-text">{{ hoverDateLabel }}</span>
        <div class="tooltip-line"></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.timeline-container {
  width: 100%;
  height: 100%;
  position: relative;
  user-select: none;
  transform: translateZ(0);
  cursor: none;
}

.dots-layer,
.years-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.dots-layer.visible,
.years-layer.visible {
  opacity: 1;
}

.month-dot {
  position: absolute;
  right: 3px;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background-color: rgba(var(--v-theme-on-surface), 0.1);
  transform: translateY(-50%);
  pointer-events: none;
  contain: strict;
}

.year-item {
  position: absolute;
  right: 8px;
  padding: 5px 7px;
  border-radius: 10px;
  font-family: 'Montserrat', Arial, sans-serif;
  font-size: 12px;
  font-weight: 500;
  color: rgba(var(--v-theme-on-background), 0.73);
  line-height: 1;
  /* Center the pill vertically on the coordinate */
  transform: translateY(-50%);
  transition: background-color 0.1s ease;
}

.year-item.is-hovering {
  background-color: rgba(var(--v-theme-surface-container), 0.5);
}

.scroll-thumb {
  position: absolute;
  right: 3px;
  width: 6px;
  background-color: rgb(var(--v-theme-primary));
  border-radius: 3px;
  pointer-events: none;
  transition:
    transform 0.1s linear,
    height 0.25s cubic-bezier(0.25, 0.8, 0.5, 1);
  will-change: transform;
  transform: translateZ(0);
  backface-visibility: hidden;
}

.scroll-thumb.is-dragging {
  transition: none;
}

.scroll-thumb::before {
  content: '';
  position: absolute;
  top: 50%;
  right: 0;
  width: 40px;
  height: 3px;
  background-color: rgb(var(--v-theme-primary));
  transform: translateY(-50%) scaleX(0) translateZ(0);
  transform-origin: right center;
  border-radius: 3px 0 0 3px;
  opacity: 0;
  transition:
    transform 0.2s cubic-bezier(0.25, 0.8, 0.5, 1),
    opacity 0.2s ease;
  will-change: transform, opacity;
}

.scroll-thumb.is-protruded::before {
  transform: translateY(-50%) scaleX(1) translateZ(0);
  opacity: 1;
}

.timeline-track {
  position: absolute;
  right: 3px;
  width: 6px;
  background-color: rgba(var(--v-theme-on-surface), 0.08);
  border-radius: 3px;
  pointer-events: none;
}

.timeline-tooltip {
  position: absolute;
  right: 0;
  width: 0;
  height: 0;
  pointer-events: none;
  overflow: visible;
  z-index: 10;
  top: 0;
  will-change: transform;
}

.tooltip-content {
  position: absolute;
  top: 0;
  right: 0;
}

.tooltip-text {
  position: absolute;
  right: 3px;
  bottom: 5px; /* Sits above the line */
  font-family: 'Montserrat', Arial, sans-serif;
  font-size: 10px;
  font-weight: 600;
  color: rgb(var(--v-theme-on-primary));
  background-color: rgb(var(--v-theme-primary));
  padding: 4px 8px;
  border-radius: 8px 0 0 8px;
  white-space: nowrap;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  opacity: 0;
  transform: translateX(10px);
  animation: slideIn 0.2s ease forwards;
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

@keyframes slideIn {
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
</style>
