<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useTimelineStore } from '@/scripts/stores/timeline/timelineStore.ts'

interface DateRange {
  startDate: Date | null
  endDate: Date | null
  active: boolean
  startGranularity: 'month' | 'day'
  endGranularity: 'month' | 'day'
}

const props = defineProps<{
  modelValue: DateRange
}>()

const emit = defineEmits(['update:modelValue', 'change'])

const timelineStore = useTimelineStore()
const isOpen = ref(false)

// Sliders local state (indices of chronologicalRatios)
const leftIndex = ref(0)
const rightIndex = ref(0)

// Granularity state
const startGranularity = ref<'month' | 'day'>('month')
const endGranularity = ref<'month' | 'day'>('month')

// Menus for date pickers
const startDateMenu = ref(false)
const endDateMenu = ref(false)

const trackRef = ref<HTMLElement | null>(null)
const isDraggingLeft = ref(false)
const isDraggingRight = ref(false)

// Fetch timeline ratios if not loaded
onMounted(async () => {
  if (timelineStore.monthRatios.length === 0) {
    await timelineStore.initialize()
  }
  resetIndices()
  syncSlidersFromDates()
})

// Chronological month ratios for the histogram
const chronologicalRatios = computed(() => {
  return [...timelineStore.monthRatios].sort((a, b) => a.monthId.localeCompare(b.monthId))
})

const maxCount = computed(() => {
  if (chronologicalRatios.value.length === 0) return 1
  return Math.max(...chronologicalRatios.value.map((r) => r.count))
})

const totalIntervals = computed(() => {
  return Math.max(1, chronologicalRatios.value.length - 1)
})

// Initialize left and right indices to cover the full range
function resetIndices() {
  leftIndex.value = 0
  rightIndex.value = Math.max(0, chronologicalRatios.value.length - 1)
  startGranularity.value = 'month'
  endGranularity.value = 'month'
}

// Convert monthId string "YYYY-MM-DD" to Date
function getStartOfMonth(monthStr: string): Date {
  return new Date(monthStr + 'T00:00:00')
}

function getEndOfMonth(monthStr: string): Date {
  const date = new Date(monthStr + 'T00:00:00')
  date.setMonth(date.getMonth() + 1)
  return new Date(date.getTime() - 1)
}

// Format date for display on buttons
function formatDateLabel(date: Date | null, granularity: 'month' | 'day'): string {
  if (!date) return 'Select Date'
  if (granularity === 'month') {
    return date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
  }
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

// Earliest and latest bounds labels
const earliestLabel = computed(() => {
  if (chronologicalRatios.value.length === 0) return ''
  const date = getStartOfMonth(chronologicalRatios.value[0]!.monthId)
  return date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
})

const latestLabel = computed(() => {
  if (chronologicalRatios.value.length === 0) return ''
  const date = getStartOfMonth(chronologicalRatios.value[chronologicalRatios.value.length - 1]!.monthId)
  return date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
})

// The label displayed on the closed floating button
const closedButtonLabel = computed(() => {
  if (!props.modelValue.active || !props.modelValue.startDate || !props.modelValue.endDate) {
    return 'Date filter'
  }
  const startStr = formatDateLabel(props.modelValue.startDate, props.modelValue.startGranularity)
  const endStr = formatDateLabel(props.modelValue.endDate, props.modelValue.endGranularity)
  return `Date filtered from ${startStr} to ${endStr}`
})

// Sync local left/right slider indices when external date props change
function syncSlidersFromDates() {
  if (chronologicalRatios.value.length === 0) return

  if (props.modelValue.startDate) {
    const startIso = props.modelValue.startDate.toISOString().substring(0, 7) + '-01'
    const index = chronologicalRatios.value.findIndex((r) => r.monthId === startIso)
    if (index !== -1) {
      leftIndex.value = index
    } else {
      const targetTime = props.modelValue.startDate.getTime()
      let closestIdx = 0
      let minDiff = Infinity
      chronologicalRatios.value.forEach((r, idx) => {
        const diff = Math.abs(getStartOfMonth(r.monthId).getTime() - targetTime)
        if (diff < minDiff) {
          minDiff = diff
          closestIdx = idx
        }
      })
      leftIndex.value = closestIdx
    }
  } else {
    leftIndex.value = 0
  }

  if (props.modelValue.endDate) {
    const endIso = props.modelValue.endDate.toISOString().substring(0, 7) + '-01'
    const index = chronologicalRatios.value.findIndex((r) => r.monthId === endIso)
    if (index !== -1) {
      rightIndex.value = index
    } else {
      const targetTime = props.modelValue.endDate.getTime()
      let closestIdx = chronologicalRatios.value.length - 1
      let minDiff = Infinity
      chronologicalRatios.value.forEach((r, idx) => {
        const diff = Math.abs(getStartOfMonth(r.monthId).getTime() - targetTime)
        if (diff < minDiff) {
          minDiff = diff
          closestIdx = idx
        }
      })
      rightIndex.value = closestIdx
    }
  } else {
    rightIndex.value = Math.max(0, chronologicalRatios.value.length - 1)
  }

  startGranularity.value = props.modelValue.startGranularity
  endGranularity.value = props.modelValue.endGranularity
}

// Watch modelValue to sync sliders
watch(() => props.modelValue, () => {
  syncSlidersFromDates()
}, { deep: true })

// Drag event handlers
function handleTrackMouseDown(e: MouseEvent, target: 'left' | 'right') {
  e.preventDefault()
  if (target === 'left') isDraggingLeft.value = true
  else isDraggingRight.value = true

  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)
}

function onMouseMove(e: MouseEvent) {
  if (!trackRef.value || chronologicalRatios.value.length === 0) return
  const rect = trackRef.value.getBoundingClientRect()
  const pct = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100))
  const N = chronologicalRatios.value.length
  const index = Math.round((pct / 100) * (N - 1))

  if (isDraggingLeft.value) {
    const newLeft = Math.min(index, rightIndex.value)
    if (newLeft !== leftIndex.value) {
      leftIndex.value = newLeft
      startGranularity.value = 'month'
      updateRange(true) // dragging
    }
  } else if (isDraggingRight.value) {
    const newRight = Math.max(index, leftIndex.value)
    if (newRight !== rightIndex.value) {
      rightIndex.value = newRight
      endGranularity.value = 'month'
      updateRange(true) // dragging
    }
  }
}

function onMouseUp() {
  isDraggingLeft.value = false
  isDraggingRight.value = false
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('mouseup', onMouseUp)
  updateRange(false) // final change
}

// Touch event handlers for mobile devices
function handleTrackTouchStart(e: TouchEvent, target: 'left' | 'right') {
  if (target === 'left') isDraggingLeft.value = true
  else isDraggingRight.value = true

  window.addEventListener('touchmove', onTouchMove)
  window.addEventListener('touchend', onTouchEnd)
}

function onTouchMove(e: TouchEvent) {
  if (!trackRef.value || chronologicalRatios.value.length === 0 || e.touches.length === 0) return
  const touch = e.touches[0]!
  const rect = trackRef.value.getBoundingClientRect()
  const pct = Math.max(0, Math.min(100, ((touch.clientX - rect.left) / rect.width) * 100))
  const N = chronologicalRatios.value.length
  const index = Math.round((pct / 100) * (N - 1))

  if (isDraggingLeft.value) {
    const newLeft = Math.min(index, rightIndex.value)
    if (newLeft !== leftIndex.value) {
      leftIndex.value = newLeft
      startGranularity.value = 'month'
      updateRange(true)
    }
  } else if (isDraggingRight.value) {
    const newRight = Math.max(index, leftIndex.value)
    if (newRight !== rightIndex.value) {
      rightIndex.value = newRight
      endGranularity.value = 'month'
      updateRange(true)
    }
  }
}

function onTouchEnd() {
  isDraggingLeft.value = false
  isDraggingRight.value = false
  window.removeEventListener('touchmove', onTouchMove)
  window.removeEventListener('touchend', onTouchEnd)
  updateRange(false)
}

// Triggered when date ranges are changed
function updateRange(isDragging = false) {
  if (chronologicalRatios.value.length === 0) return

  const startMonth = chronologicalRatios.value[leftIndex.value]!
  const endMonth = chronologicalRatios.value[rightIndex.value]!

  const start = startGranularity.value === 'month'
    ? getStartOfMonth(startMonth.monthId)
    : props.modelValue.startDate

  const end = endGranularity.value === 'month'
    ? getEndOfMonth(endMonth.monthId)
    : props.modelValue.endDate

  // Check if fully reset (covering all months on month granularity)
  const isFullRange = leftIndex.value === 0 &&
                      rightIndex.value === chronologicalRatios.value.length - 1 &&
                      startGranularity.value === 'month' &&
                      endGranularity.value === 'month'

  emit('update:modelValue', {
    startDate: start,
    endDate: end,
    active: !isFullRange,
    startGranularity: startGranularity.value,
    endGranularity: endGranularity.value,
  })

  // Propagate change event
  emit('change', { isDragging })
}

// Date picker menu actions
function onStartDateInput(newDate: unknown) {
  if (!(newDate instanceof Date)) return
  startGranularity.value = 'day'

  // Make sure start date does not exceed end date
  let validDate = newDate
  if (props.modelValue.endDate && newDate > props.modelValue.endDate) {
    validDate = new Date(props.modelValue.endDate)
  }

  emit('update:modelValue', {
    ...props.modelValue,
    startDate: validDate,
    active: true,
    startGranularity: 'day',
  })

  startDateMenu.value = false

  // Wait for tick then sync sliders
  setTimeout(() => {
    syncSlidersFromDates()
    emit('change', { isDragging: false })
  }, 10)
}

function onEndDateInput(newDate: unknown) {
  if (!(newDate instanceof Date)) return
  endGranularity.value = 'day'

  // Make sure end date is not before start date
  let validDate = newDate
  if (props.modelValue.startDate && newDate < props.modelValue.startDate) {
    validDate = new Date(props.modelValue.startDate)
  }

  emit('update:modelValue', {
    ...props.modelValue,
    endDate: validDate,
    active: true,
    endGranularity: 'day',
  })

  endDateMenu.value = false

  // Wait for tick then sync sliders
  setTimeout(() => {
    syncSlidersFromDates()
    emit('change', { isDragging: false })
  }, 10)
}

function clearFilter() {
  resetIndices()
  emit('update:modelValue', {
    startDate: null,
    endDate: null,
    active: false,
    startGranularity: 'month',
    endGranularity: 'month',
  })
  setTimeout(() => {
    emit('change', { isDragging: false })
  }, 10)
}
</script>

<template>
  <div class="map-date-filter">
    <!-- CLOSED STATE BUTTON -->
    <v-btn
      v-if="!isOpen"
      class="map-date-filter-chip"
      variant="flat"
      rounded="xl"
      elevation="4"
      prepend-icon="mdi-calendar-filter"
      @click="isOpen = true"
    >
      {{ closedButtonLabel }}
    </v-btn>

    <!-- OPEN STATE DIALOG CARD -->
    <v-card
      v-else
      class="map-date-filter-panel"
      elevation="8"
      rounded="xl"
    >
      <!-- Close Button -->
      <v-btn
        icon="mdi-close"
        variant="text"
        density="comfortable"
        class="panel-close-btn"
        size="small"
        @click="isOpen = false"
      />

      <!-- Title / Header -->
      <div class="panel-header">
        <span class="panel-title">Filter from</span>

        <!-- Start Date Button -->
        <v-menu
          v-model="startDateMenu"
          :close-on-content-click="false"
          location="top center"
        >
          <template v-slot:activator="{ props: menuProps }">
            <v-btn
              v-bind="menuProps"
              variant="tonal"
              color="primary"
              density="compact"
              rounded="lg"
              class="date-button ml-1 mr-1"
            >
              {{ formatDateLabel(modelValue.startDate || (chronologicalRatios[0] ? getStartOfMonth(chronologicalRatios[0].monthId) : null), startGranularity) }}
            </v-btn>
          </template>
          <v-card border rounded="lg">
            <v-date-picker
              bg-color="surface-container"
              color="primary"
              :model-value="modelValue.startDate || (chronologicalRatios[0] ? getStartOfMonth(chronologicalRatios[0].monthId) : new Date())"
              @update:model-value="onStartDateInput"
              hide-header
            />
          </v-card>
        </v-menu>

        <span class="panel-title">to</span>

        <!-- End Date Button -->
        <v-menu
          v-model="endDateMenu"
          :close-on-content-click="false"
          location="top center"
        >
          <template v-slot:activator="{ props: menuProps }">
            <v-btn
              v-bind="menuProps"
              variant="tonal"
              color="primary"
              density="compact"
              rounded="lg"
              class="date-button ml-1 mr-1"
            >
              {{ formatDateLabel(modelValue.endDate || (chronologicalRatios[chronologicalRatios.length - 1] ? getEndOfMonth(chronologicalRatios[chronologicalRatios.length - 1].monthId) : null), endGranularity) }}
            </v-btn>
          </template>
          <v-card border rounded="lg">
            <v-date-picker
              bg-color="surface-container"
              color="primary"
              :model-value="modelValue.endDate || (chronologicalRatios[chronologicalRatios.length - 1] ? getEndOfMonth(chronologicalRatios[chronologicalRatios.length - 1].monthId) : new Date())"
              @update:model-value="onEndDateInput"
              hide-header
            />
          </v-card>
        </v-menu>

        <!-- Reset Button -->
        <v-btn
          v-if="modelValue.active"
          variant="text"
          color="error"
          density="compact"
          size="small"
          class="reset-button ml-2"
          @click="clearFilter"
        >
          Reset
        </v-btn>
      </div>

      <!-- Histogram & Range Slider Area -->
      <div v-if="chronologicalRatios.length > 0" class="histogram-slider-area">
        <!-- Bounds Labels -->
        <span class="bounds-label bounds-left">{{ earliestLabel }}</span>

        <div class="histogram-wrapper">
          <!-- Histogram bars -->
          <div class="histogram-bars">
            <div
              v-for="(month, idx) in chronologicalRatios"
              :key="month.monthId"
              class="histogram-bar"
              :class="{ 'is-active': idx >= leftIndex && idx <= rightIndex }"
              :style="{
                height: `${(month.count / maxCount) * 100}%`,
                width: `${100 / chronologicalRatios.length}%`
              }"
            ></div>
          </div>

          <!-- Draggable slider track -->
          <div ref="trackRef" class="slider-track">
            <!-- Selected Range Highlight -->
            <div
              class="slider-highlight"
              :style="{
                left: `${(leftIndex / totalIntervals) * 100}%`,
                right: `${100 - (rightIndex / totalIntervals) * 100}%`
              }"
            ></div>

            <!-- Left Handle (Start Date) -->
            <div
              class="slider-handle left-handle"
              :style="{
                left: `${(leftIndex / totalIntervals) * 100}%`
              }"
              @mousedown="handleTrackMouseDown($event, 'left')"
              @touchstart="handleTrackTouchStart($event, 'left')"
            >
              <div class="handle-stick"></div>
              <div class="handle-anchor"></div>
            </div>

            <!-- Right Handle (End Date) -->
            <div
              class="slider-handle right-handle"
              :style="{
                left: `${(rightIndex / totalIntervals) * 100}%`
              }"
              @mousedown="handleTrackMouseDown($event, 'right')"
              @touchstart="handleTrackTouchStart($event, 'right')"
            >
              <div class="handle-stick"></div>
              <div class="handle-anchor"></div>
            </div>
          </div>
        </div>

        <span class="bounds-label bounds-right">{{ latestLabel }}</span>
      </div>
      <div v-else class="loading-state">
        <v-progress-circular indeterminate size="20" width="2" color="primary" />
      </div>
    </v-card>
  </div>
</template>

<style>
.map-date-filter {
  position: absolute;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 20;
  font-family: inherit;
  display: flex;
  justify-content: center;
  pointer-events: auto; /* Ensure clicks reach the component */
}

/* Glassmorphism card for open panel */
.map-date-filter-panel {
  width: 520px;
  max-width: 90vw;
  background-color: rgba(var(--v-theme-surface), 0.72) !important;
  backdrop-filter: blur(16px) saturate(180%) !important;
  -webkit-backdrop-filter: blur(16px) saturate(180%) !important;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12) !important;
  padding: 16px;
  box-shadow: 0 12px 36px rgba(0, 0, 0, 0.35) !important;
  display: flex;
  flex-direction: column;
  position: relative;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Semi-transparent closed button */
.map-date-filter-chip {
  background-color: rgba(var(--v-theme-surface), 0.85) !important;
  backdrop-filter: blur(12px) !important;
  -webkit-backdrop-filter: blur(12px) !important;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.1) !important;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2) !important;
  text-transform: none !important;
  font-weight: 500 !important;
  font-size: 14px !important;
  color: rgb(var(--v-theme-on-surface)) !important;
  height: 40px !important;
  padding: 0 20px !important;
}

.panel-close-btn {
  position: absolute !important;
  top: 8px;
  right: 8px;
  color: rgba(var(--v-theme-on-surface), 0.6);
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  font-size: 14px;
  font-weight: 500;
  color: rgb(var(--v-theme-on-surface));
  margin-bottom: 14px;
  padding-right: 24px; /* avoid overlapping close btn */
}

.panel-title {
  color: rgba(var(--v-theme-on-surface), 0.8);
}

.date-button {
  font-size: 13px !important;
  text-transform: none !important;
  letter-spacing: 0 !important;
  font-weight: 600 !important;
  box-shadow: none !important;
}

.reset-button {
  text-transform: none !important;
  font-weight: 600 !important;
}

.histogram-slider-area {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 4px;
}

.bounds-label {
  font-size: 10px;
  font-weight: 600;
  color: rgba(var(--v-theme-on-surface), 0.5);
  min-width: 54px;
  text-align: center;
}

.histogram-wrapper {
  position: relative;
  flex-grow: 1;
  height: 64px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}

.histogram-bars {
  display: flex;
  align-items: flex-end;
  height: 200px;
  width: 100%;
  overflow: hidden;
  padding-bottom: 2px;
  box-sizing: border-box;
}

.histogram-bar {
  background-color: rgba(var(--v-theme-on-surface), 0.15);
  border-radius: 2px 2px 0 0;
  margin: 0 0.5px;
  transition: background-color 0.2s ease, height 0.2s ease;
}

.histogram-bar.is-active {
  background-color: rgb(var(--v-theme-primary));
  opacity: 0.85;
}

/* Slider Overlays */
.slider-track {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 64px; /* overlays full height of wrapper */
  pointer-events: none;
}

.slider-highlight {
  position: absolute;
  top: 0;
  bottom: 12px; /* aligns above the anchor handles */
  background-color: rgba(var(--v-theme-primary), 0.08);
  border-radius: 4px;
  pointer-events: none;
}

.slider-handle {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 20px;
  margin-left: -10px; /* center on the point */
  cursor: ew-resize;
  pointer-events: auto; /* let user drag handles */
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
}

/* Vertical Stick */
.handle-stick {
  width: 2px;
  height: calc(100% - 12px);
  background-color: rgb(var(--v-theme-primary));
  opacity: 0.85;
  pointer-events: none;
}

/* Draggable Anchor at bottom */
.handle-anchor {
  width: 12px;
  height: 12px;
  background-color: rgb(var(--v-theme-primary));
  border: 2px solid white;
  border-radius: 50%;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
  box-sizing: border-box;
  margin-top: 1px;
  transition: transform 0.15s ease, background-color 0.15s ease;
}

.slider-handle:hover .handle-anchor {
  transform: scale(1.25);
  background-color: rgb(var(--v-theme-secondary));
}

.loading-state {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 48px;
}
</style>
