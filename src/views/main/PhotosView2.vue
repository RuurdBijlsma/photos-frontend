<script setup lang="ts">
import { usePhotoStore } from '@/stores/photosStore.ts'
import { useRoute } from 'vue-router'
import photoService from '@/script/services/photoService.ts'
import { onMounted, ref, watch } from 'vue'
import { useElementSize } from '@vueuse/core'
import type { MediaItemDto } from '@/script/types/api/photos.ts'

// --- Constants for Clarity and Configuration ---
const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]
const BASE_ROW_HEIGHT = 320 // Target height for photos in a row
const PHOTO_GAP = 2 // Gap between photos in pixels
const MAX_RESIZE_RATIO = 1.3 // Prevents rows with few images from becoming huge
const MEDIA_FETCH_LIMIT = 100 // Number of photos to fetch around the initial date
const THUMB_HEIGHT_OPTIONS = [240, 360, 480, 720, 1080, 1440]

// --- Type Definitions for our new, cleaner data structure ---
interface DisplayRow {
  id: string // A unique key for the v-for
  mediaItems: MediaItemDto[]
  height: number
  thumbHeight: number
}

interface DisplayMonth {
  month: number
  monthName: string
  rows: DisplayRow[]
}

interface DisplayYear {
  year: number
  months: DisplayMonth[]
}

// --- Component State ---
const photosStore = usePhotoStore()
const route = useRoute()
const photoGridContainer = ref<HTMLElement | null>(null)
const { width: containerWidth } = useElementSize(photoGridContainer)
const timeline = ref<DisplayYear[]>([])

// --- Initial Data Loading ---
onMounted(async () => {
  // Wait for the timeline summary (e.g., list of available months) to load
  await photosStore.fetchTimelineSummary()

  // Determine the starting date from the URL query or default to today
  const dateString = route.query['date']?.toString() || new Date().toISOString()
  const initialDate = new Date(dateString)

  // Ask the store which specific months we need to fetch around that date
  const monthsToFetch = photosStore.fetchMediaAroundDate(initialDate, MEDIA_FETCH_LIMIT)

  // Fetch the actual media items for those months
  if (monthsToFetch && monthsToFetch.size > 0) {
    await photosStore.fetchMediaByMonth(Array.from(monthsToFetch))
  }
})

// --- Grid Calculation Logic ---

/**
 * Transforms the flat month data from the store into a structured timeline
 * for rendering a justified photo grid.
 */
function calculateTimelineGrid() {
  const width = containerWidth.value
  // Don't calculate if the container has no width or if there are no photos to display
  if (width === 0 || photosStore.months.length === 0) {
    timeline.value = []
    return
  }

  const newTimeline: DisplayYear[] = []
  let rowKey = 0

  for (const monthGroup of photosStore.months) {
    const [year, month] = monthGroup.month.split('-').map(Number)

    // Find or create the year and month groups in our new structure
    let currentYear = newTimeline.find((y) => y.year === year)
    if (!currentYear) {
      currentYear = { year, months: [] }
      newTimeline.push(currentYear)
    }

    let currentMonth = currentYear.months.find((m) => m.month === month)
    if (!currentMonth) {
      currentMonth = { month, monthName: MONTH_NAMES[month - 1], rows: [] }
      currentYear.months.push(currentMonth)
    }

    let currentRowItems: MediaItemDto[] = []
    // Start with a negative gap to account for N-1 gaps for N photos
    let currentWidth = -PHOTO_GAP

    for (const mediaItem of monthGroup.mediaItems) {
      // Calculate the aspect ratio to determine the item's width at the base height
      const aspectRatio = mediaItem.w / mediaItem.h
      currentWidth += BASE_ROW_HEIGHT * aspectRatio + PHOTO_GAP
      currentRowItems.push(mediaItem)

      // When the row is full, process and add it
      if (currentWidth >= width) {
        // Calculate the ratio needed to make the row fit the container width perfectly
        const justificationRatio = width / currentWidth

        // Cap the growth to prevent excessive distortion for rows with few items
        const finalRatio = Math.min(justificationRatio, MAX_RESIZE_RATIO)
        let rowHeight = BASE_ROW_HEIGHT * finalRatio
        let usedThumbHeight = 0
        for (const thumbHeight of THUMB_HEIGHT_OPTIONS) {
          if (thumbHeight > rowHeight) {
            usedThumbHeight = thumbHeight
            break
          }
        }

        currentMonth.rows.push({
          id: `row-${rowKey++}`,
          mediaItems: currentRowItems,
          height: rowHeight,
          thumbHeight: usedThumbHeight,
        })

        // Reset for the next row
        currentRowItems = []
        currentWidth = -PHOTO_GAP
      }
    }

    // Add any remaining photos that didn't fill a full row
    if (currentRowItems.length > 0) {
      // If these items are close to filling a row, justify them
      let rowRatio = width / currentWidth
      let height = BASE_ROW_HEIGHT
      if (rowRatio < MAX_RESIZE_RATIO) {
        height = BASE_ROW_HEIGHT * rowRatio
      }
      currentMonth.rows.push({
        id: `row-${rowKey++}`,
        mediaItems: currentRowItems,
        height,
        thumbHeight: 360,
      })
    }
  }

  timeline.value = newTimeline
}

// --- Watchers to Trigger Recalculation ---

// Recalculate grid when photo data changes
watch(() => photosStore.months, calculateTimelineGrid, { deep: true })

// OPTION 1: Recalculate grid on resize, but debounce to avoid performance issues
// watchDebounced(containerWidth, calculateTimelineGrid, {
//   debounce: RESIZE_DEBOUNCE_MS,
// })
// OPTION 2: Middenweg - Add requestAnimationFrame to schedule the calc for a good moment
// watch(containerWidth, () => requestAnimationFrame(calculateTimelineGrid))
// OPTION 3: Performance is fine, and it looks very cool to recalc every frame.
watch(containerWidth, calculateTimelineGrid)
</script>

<template>
  <div class="photo-grid-container" ref="photoGridContainer">
    <!-- Loop through years -->
    <div v-for="year in timeline" :key="year.year" class="year-group">
      <h1 v-if="year.year !== (new Date()).getFullYear()">{{ year.year }}</h1>

      <!-- Loop through months in each year -->
      <div v-for="month in year.months" :key="month.month" class="month-group">
        <h2>{{ month.monthName }}</h2>

        <div class="month-photo-group">
          <!-- Loop through the calculated rows in each month -->
          <div
            v-for="row in month.rows"
            :key="row.id"
            class="photo-row"
            :style="{ gap: `${PHOTO_GAP}px`, marginBottom: `${PHOTO_GAP}px` }"
          >
            <div v-for="media in row.mediaItems" :key="media.i" class="media-item">
              <img
                :src="photosService.getPhotoThumbnail(media.i, row.thumbHeight)"
                :height="row.height"
                :width="(media.w / media.h) * row.height"
                alt="User photo or video."
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.year-group h1 {
  padding: 58px 0 0px;
  text-align: center;
}

.month-photo-group {
  border-radius: 15px;
  overflow: hidden;
}

.month-group h2 {
  /* Added some padding */
  padding: 20px 0 10px 15px;
  font-weight: 500;
  font-size: 24px;
}

.photo-row {
  display: flex;
  align-items: flex-start; /* Align items to the top */
}

.media-item img {
  display: block; /* Removes bottom space under the image */
}
</style>
