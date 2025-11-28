<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, shallowRef, watch } from 'vue'
import type { TimelineMonth } from '@/scripts/types/generated/photos.ts'
import { MONTHS } from '@/scripts/constants.ts'
import { useTimelineScroll } from '@/scripts/composables/photo-grid/useTimelineScroll.ts'

// --- Props ---
const props = defineProps<{
  months: TimelineMonth[] | undefined | null
}>()

// --- Timeline Scroll Composable ---
const { dateInView, requestScrollToDate } = useTimelineScroll()

// --- Refs ---
const containerRef = ref<HTMLElement | null>(null)
const containerHeight = ref(500) // Default fallback
const hovering = shallowRef(false)
const hoverY = shallowRef(0)
const isScrolling = ref(false)
const isDragging = ref(false)
let scrollTimeout: number | null = null

// --- Config ---
const PADDING = { top: 5, bottom: 20, horizontal: 5 }
const FONT_SIZE = 12
const MIN_YEAR_SPACING = FONT_SIZE + 10

// --- State ---
// We use a lookup map for O(1) access for the thumb position
type DateLookup = {
  y: number // The normalized Y start (0-1)
  fraction: number // How much specific weight this month has
}
const lookupMap: Map<string, DateLookup> = new Map()

// These are the raw calculated normalized positions
const rawYears = shallowRef<{ label: string; y: number }[]>([])
const rawMonths = shallowRef<{ label: string; y: number }[]>([])
const thumbHeightRatio = ref(0.01)

// --- Helpers ---
const getMonthKey = (date: Date) => `${date.getFullYear()}-${date.getMonth() + 1}`
const parseMonthId = (monthId: string) => {
  const [year, month, day] = monthId.split('-').map(Number)
  return { year: year ?? 0, month: month ?? 0, day: day ?? 0 }
}

// --- Data Processing (Run when data changes) ---
function processData() {
  const items = props.months
  lookupMap.clear()

  if (!items || items.length === 0) {
    rawYears.value = []
    rawMonths.value = []
    thumbHeightRatio.value = 0.01
    return
  }

  const totalCount = items.reduce((acc, m) => acc + m.count, 0)

  // Precompute totals per year for label positioning
  const yearTotals: Record<number, number> = {}
  for (const it of items) {
    const d = parseMonthId(it.monthId)
    yearTotals[d.year] = (yearTotals[d.year] || 0) + it.count
  }

  let cumulative = 0
  let lastYear = -1

  const years: { label: string; y: number }[] = []
  const months: { label: string; y: number }[] = []

  for (const item of items) {
    const d = parseMonthId(item.monthId)
    const count = item.count

    // --- Lookup Map Construction ---
    const startY = cumulative / totalCount
    const weight = count / totalCount
    const key = `${d.year}-${d.month}`
    lookupMap.set(key, { y: startY, fraction: weight })

    // --- Visual State Construction ---
    if (d.year !== lastYear) {
      const yearTotal = yearTotals[d.year] || 0
      const yForYear = (cumulative + yearTotal) / totalCount
      years.push({ label: String(d.year), y: yForYear })
      lastYear = d.year
    }

    cumulative += count
    const yForMonth = cumulative / totalCount // End of month
    months.push({
      label: `${MONTHS[d.month - 1]?.substring(0, 3) ?? ''} ${d.year}`,
      y: yForMonth,
    })
  }

  const approxItemsPerPage = 15
  thumbHeightRatio.value = Math.max(approxItemsPerPage / (totalCount || 1), 0.01)

  rawYears.value = years
  rawMonths.value = months
}

// --- Computed Layouts ---

// 1. Month Dots (Pure CSS positioning)
const monthDots = computed(() => {
  return rawMonths.value.map((m) => ({
    // Formula: PADDING.top + y * (height - (PADDING.top + PADDING.bottom))
    // We express this in % to avoid JS recalculation on resize for dots
    style: {
      top: `calc(${PADDING.top}px + ${m.y} * (100% - ${PADDING.top + PADDING.bottom}px))`,
    },
  }))
})

// 2. Years (Requires collision detection based on pixel height)
const visibleYears = computed(() => {
  const height = containerHeight.value
  const years = rawYears.value
  const result: { label: string; style: any }[] = []

  let prevY = -Infinity

  for (let i = 0; i < years.length; i++) {
    const { label, y } = years[i]!
    // Calculate ideal pixel position
    const targetY = PADDING.top + y * (height - (PADDING.top + PADDING.bottom))

    // Collision check
    // If too close to previous, skip unless it's the last one?
    // Original logic: if (i > 0 && targetY - prevY < MIN_YEAR_SPACING && i !== years.length - 1) continue
    // if (i > 0) { const diff = targetY - prevY; if (diff < MIN_YEAR_SPACING) finalY += MIN_YEAR_SPACING - diff }

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
  const date = dateInView.value
  if (!date || lookupMap.size === 0) return { display: 'none' }

  const key = getMonthKey(date)
  const data = lookupMap.get(key)
  let normY = 0

  if (data) {
    const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
    const dayRatio = 1 - Math.min(1, date.getDate() / daysInMonth)
    normY = data.y + data.fraction * dayRatio
  }

  return {
    height: `calc(${thumbHeightRatio.value} * (100% - ${PADDING.top + PADDING.bottom}px))`,
    top: `calc(${PADDING.top}px + ${normY} * (100% - ${PADDING.top + PADDING.bottom}px))`,
  }
})

// 4. Hover Tooltip
const hoverDateLabel = computed(() => {
  if (!hovering.value && !isDragging.value) return ''
  const y = hoverY.value
  const height = containerHeight.value
  const effectiveHeight = height - (PADDING.top + PADDING.bottom)
  if (effectiveHeight <= 0) return ''

  // Normalize Y to 0-1 range relative to the track
  let normY = (y - PADDING.top) / effectiveHeight
  normY = Math.max(0, Math.min(1, normY))

  // Find the closest month
  // Since rawMonths are sorted by Y, we can find the first one that is >= normY
  // or just find the closest one.
  // Actually, rawMonths stores the END y of the month.
  // So we want the first month where m.y >= normY
  const months = rawMonths.value
  const match = months.find((m) => m.y >= normY)
  return match ? match.label : (months[months.length - 1]?.label ?? '')
})

const tooltipStyle = computed(() => {
  const height = containerHeight.value
  const effectiveHeight = height - (PADDING.top + PADDING.bottom)

  // Clamp the tooltip position to stay within the track
  const minY = PADDING.top
  const maxY = PADDING.top + effectiveHeight
  const clampedY = Math.max(minY, Math.min(maxY, hoverY.value))

  return {
    top: `${clampedY}px`,
  }
})

const trackStyle = computed(() => ({
  top: `${PADDING.top}px`,
  height: `calc(100% - ${PADDING.top + PADDING.bottom}px)`,
}))

// --- Watchers ---
watch(() => props.months, processData, { immediate: true })

watch(
  dateInView,
  () => {
    isScrolling.value = true
    if (scrollTimeout) clearTimeout(scrollTimeout)
    scrollTimeout = window.setTimeout(() => {
      isScrolling.value = false
    }, 3000)
  },
)

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

function getDateFromY(y: number): Date | null {
  const height = containerHeight.value
  const effectiveHeight = height - (PADDING.top + PADDING.bottom)
  if (effectiveHeight <= 0) return null

  // Normalize Y to 0-1 range relative to the track
  let normY = (y - PADDING.top) / effectiveHeight
  normY = Math.max(0, Math.min(1, normY))

  // Find the two months that bracket this position
  const months = rawMonths.value
  if (months.length === 0) return null

  // Find the first month where m.y >= normY
  const nextMonthIndex = months.findIndex((m) => m.y >= normY)

  if (nextMonthIndex === -1) {
    // We're past the last month, return the last month's date
    const lastMonth = months[months.length - 1]!
    const parsed = parseMonthId(lastMonth.label.split(' ').reverse().join('-') + '-1')
    return new Date(parsed.year, parsed.month - 1, 1)
  }

  if (nextMonthIndex === 0) {
    // We're before the first month, return the first month's date
    const firstMonth = months[0]!
    const parts = firstMonth.label.split(' ')
    const monthName = parts[0]!
    const year = parseInt(parts[1]!)
    const monthIndex = MONTHS.findIndex(m => m.startsWith(monthName))
    return new Date(year, monthIndex, 1)
  }

  // Interpolate between the two months
  const nextMonth = months[nextMonthIndex]!
  const prevMonth = months[nextMonthIndex - 1]!

  // Parse the month labels (format: "Mon YYYY")
  const parseLabel = (label: string) => {
    const parts = label.split(' ')
    const monthName = parts[0]!
    const year = parseInt(parts[1]!)
    const monthIndex = MONTHS.findIndex(m => m.startsWith(monthName))
    return { year, month: monthIndex + 1 }
  }

  const prev = parseLabel(prevMonth.label)
  const next = parseLabel(nextMonth.label)

  // Get the lookup data for these months to find their start positions
  const prevKey = `${prev.year}-${prev.month}`
  const nextKey = `${next.year}-${next.month}`
  const prevData = lookupMap.get(prevKey)
  const nextData = lookupMap.get(nextKey)

  if (!prevData || !nextData) {
    // Fallback to next month
    return new Date(next.year, next.month - 1, 1)
  }

  // Interpolate within the range
  const prevEndY = prevMonth.y
  const nextEndY = nextMonth.y
  const ratio = (normY - prevEndY) / (nextEndY - prevEndY)

  // Calculate the date
  const prevDate = new Date(prev.year, prev.month - 1, 1)
  const nextDate = new Date(next.year, next.month - 1, 1)
  const timeDiff = nextDate.getTime() - prevDate.getTime()
  const interpolatedTime = prevDate.getTime() + timeDiff * ratio

  return new Date(interpolatedTime)
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
    <div v-show="hovering || isScrolling || isDragging" class="dots-layer">
      <div v-for="(dot, i) in monthDots" :key="i" class="month-dot" :style="dot.style"></div>
    </div>

    <!-- Years -->
    <Transition name="fade">
      <div v-show="hovering || isScrolling || isDragging" class="years-layer">
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
    </Transition>

    <!-- Scroll Thumb -->
    <div
      class="scroll-thumb"
      :class="{ 'is-protruded': isScrolling || hovering || isDragging }"
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
    top 0.25s cubic-bezier(0.25, 0.8, 0.5, 1),
    height 0.25s cubic-bezier(0.25, 0.8, 0.5, 1);
  will-change: top, height;
  transform: translateZ(0);
  backface-visibility: hidden;
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

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.timeline-tooltip {
  position: absolute;
  right: 0;
  width: 0;
  height: 0;
  pointer-events: none;
  overflow: visible;
  z-index: 10;
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
