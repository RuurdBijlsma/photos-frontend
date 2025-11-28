<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, shallowRef, watch } from 'vue'
import type { TimelineMonth } from '@/scripts/types/generated/photos.ts'
import { MONTHS } from '@/scripts/constants.ts'

// --- Props ---
const props = defineProps<{
  months: TimelineMonth[] | undefined | null
  dateInView: Date | null
}>()

// --- Refs ---
const containerRef = ref<HTMLElement | null>(null)
const containerHeight = ref(500) // Default fallback
const hovering = shallowRef(false)
const isScrolling = ref(false)
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
  const date = props.dateInView
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

const trackStyle = computed(() => ({
  top: `${PADDING.top}px`,
  height: `calc(100% - ${PADDING.top + PADDING.bottom}px)`,
}))

// --- Watchers ---
watch(() => props.months, processData, { immediate: true })

watch(
  () => props.dateInView,
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
</script>

<template>
  <div
    ref="containerRef"
    class="timeline-container"
    @mouseenter="hovering = true"
    @mouseleave="hovering = false"
  >
    <!-- Track -->
    <div class="timeline-track" :style="trackStyle"></div>

    <!-- Month Dots -->
    <div v-show="hovering || isScrolling" class="dots-layer">
      <div v-for="(dot, i) in monthDots" :key="i" class="month-dot" :style="dot.style"></div>
    </div>

    <!-- Years -->
    <Transition name="fade">
      <div v-show="hovering || isScrolling" class="years-layer">
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
      :class="{ 'is-protruded': isScrolling || hovering }"
      :style="thumbStyle"
    ></div>
  </div>
</template>

<style scoped>
.timeline-container {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  user-select: none;
  transform: translateZ(0);
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
  right: 9px;
  padding: 5px 7px;
  border-radius: 10px;
  font-family: 'Montserrat', Arial, sans-serif;
  font-size: 12px;
  color: rgba(var(--v-theme-on-background), 0.73);
  line-height: 1;
  /* Center the pill vertically on the coordinate */
  transform: translateY(-50%);
  transition: background-color 0.1s ease;
}

.year-item.is-hovering {
  background-color: rgb(var(--v-theme-surface-container));
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
}

.scroll-thumb::before {
  content: '';
  position: absolute;
  top: 50%;
  right: 0;
  width: 40px; /* Sufficiently wide to fill the container */
  height: 3px;
  background-color: rgb(var(--v-theme-primary));
  transform: translateY(-50%) scaleX(0);
  transform-origin: right center;
  border-radius: 3px 0 0 3px;
  opacity: 0;
  transition:
    transform 0.2s cubic-bezier(0.25, 0.8, 0.5, 1),
    opacity 0.2s ease;
}

.scroll-thumb.is-protruded::before {
  transform: translateY(-50%) scaleX(1);
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
</style>
