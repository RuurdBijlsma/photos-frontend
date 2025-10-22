<script setup lang="ts">
import { usePhotosStore } from '@/stores/photosStore.ts'
import { useRoute } from 'vue-router'
import photosService from '@/script/services/photosService.ts'
import { onMounted, type Ref, ref, watch } from 'vue'
import { useElementSize } from '@vueuse/core'
import type { MediaItemDto } from '@/script/types/api/photos.ts'

const photosStore = usePhotosStore()
const route = useRoute()
const MONTHS = [
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

photosStore.fetchTimelineSummary().then(async () => {
  const dateString = (
    route.query['date'] ??
    new Date().toISOString().split('T')[0] ??
    ''
  ).toString()
  const date = new Date(dateString)
  console.log('date', date)
  const monthsToFetch = photosStore.fetchMediaAroundDate(date, 100)
  if (monthsToFetch) await photosStore.fetchMediaByMonth(Array.from(monthsToFetch))
  console.log(photosStore.months)
  calculateGrid()
})

// how to render grid
// 1. get reactive width of photos container (.images)
// 2. loop over images per month, divide up into rows, using width and photo aspect ratios and desired photo height
const photoGrid = ref(null)
const photoGridSize = useElementSize(photoGrid)
onMounted(() => {
  watch(photoGridSize.width, () => calculateGrid())
  watch(
    () => photosStore.months,
    () => calculateGrid(),
  )
  calculateGrid()
})

interface Row {
  mediaItems: MediaItemDto[]
  height: number
  key: number
  newMonth?: number
  newYear?: number
}
const rows: Ref<Row[]> = ref([])
const MAX_ROW_HEIGHT = 320
const PHOTO_GAP = 2
const MAX_GROW_RATIO = 1.3

function calculateGrid() {
  const photoGridWidth = photoGridSize.width.value
  if (photoGridWidth == 0 || Object.keys(photosStore.months).length == 0) {
    return
  }
  console.warn('Calculate Grid')
  const newRows: Row[] = []
  let index = 0

  let activeMonth = -1
  let activeYear = -1
  const addNewRow = (row: MediaItemDto[], rowWidth: number, yearMonthString: string) => {
    const [year, month] = yearMonthString.split('-').map((n) => +n)
    // Photos overflow the row
    let newMonth = undefined
    let newYear = undefined
    if (month !== activeMonth) {
      activeMonth = month
      newMonth = month
    }
    if (year !== activeYear) {
      activeYear = year
      newYear = year
    }
    let growRatio = photoGridWidth / rowWidth
    if (growRatio > MAX_GROW_RATIO) growRatio = 1
    newRows.push({
      key: index++,
      mediaItems: row,
      height: MAX_ROW_HEIGHT * growRatio,
      newMonth,
      newYear,
    })
  }

  for (const month of photosStore.months) {
    let row: MediaItemDto[] = []
    // Start with -PHOTO_GAP because for N photos there should be N-1 PHOTO_GAPs counted.
    let rowWidth = -PHOTO_GAP
    for (const mediaItem of month.mediaItems) {
      const itemRatio = mediaItem.w / mediaItem.h
      rowWidth += MAX_ROW_HEIGHT * itemRatio + PHOTO_GAP
      row.push(mediaItem)
      if (rowWidth >= photoGridWidth) {
        addNewRow(row, rowWidth, month.month)
        row = []
        rowWidth = 0
      }
    }

    if (row.length > 0) {
      // Month ended, but there's still photos to place
      addNewRow(row, rowWidth, month.month)
    }
  }
  // console.log('rows', newRows)
  rows.value = newRows
}
</script>

<template>
  <div class="images" ref="photoGrid">
    <div class="row" v-for="row in rows" :key="row.key">
      <h1 v-if="row.newYear">{{ row.newYear }}</h1>
      <h2 v-if="row.newMonth">{{ MONTHS[row.newMonth - 1] }}</h2>
      <div class="photo-row">
        <div class="media-item" v-for="media in row.mediaItems" :key="media.i">
          <img
            :src="photosService.getPhotoThumbnail(media.i, 240)"
            :height="row.height"
            alt="User photo or video."
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.row h1 {
  padding: 20px 0;
  text-align: center;
}

.row h2 {
  padding: 10px 0;
}

.photo-row {
  display: flex;
  gap: 2px;
  margin-bottom: 2px;
}

.photo-row img {
  display: block;
}
</style>
