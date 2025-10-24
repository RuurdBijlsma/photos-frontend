<script setup lang="ts">
import { type Ref, ref, watch } from 'vue'
import { useElementSize } from '@vueuse/core'
import SuperLazy from '@/components/SuperLazy.vue'
import photoService from '@/script/services/photoService.ts'
import MonthView, { type MonthLayout, type RowLayout } from '@/components/photo-grid/MonthView.vue'
import type { GetMonthlyRatiosResponse } from '@/generated/ratios.ts'
import type { LayoutItem } from 'vuetify/lib/composables/layout'

const photoGridContainer = ref<HTMLElement | null>(null)
const { width: containerWidth } = useElementSize(photoGridContainer)

const startup = async () => {
  const now = performance.now()
  const photos = await photoService.getPhotoRatios()
  // const photoStore = usePhotoStore()
  // const photos = photoStore.getPhotoRatios()
  console.log('Get Photos: ', performance.now() - now, 'ms')
  console.log({ photos })

  const now2 = performance.now()
  calculateGrid(photos)
  console.log('Initial, calc grid: ', performance.now() - now2, 'ms')
}
startup()

const months: Ref<MonthLayout[]> = ref([])

const DESIRED_HEIGHT = 240
const PHOTO_GAP = 2
const MAX_GROW_RATIO = 1.5

function calculateGrid(photos: GetMonthlyRatiosResponse) {
  if (containerWidth.value === 0) return
  const newMonths: MonthLayout[] = []
  let rows: RowLayout[] = []
  let monthHeight = -PHOTO_GAP
  for (const month of photos.results) {
    let index = 0
    let rowWidth = -PHOTO_GAP
    let rowItems: LayoutItem[] = []
    for (const ratio of month.ratios) {
      const photoWidth = ratio * DESIRED_HEIGHT
      rowWidth += photoWidth + PHOTO_GAP
      rowItems.push({ ratio, index: index++ })

      if (rowWidth > containerWidth.value) {
        let growRatio = containerWidth.value / rowWidth
        if (growRatio > MAX_GROW_RATIO) growRatio = 1
        if (growRatio > MAX_GROW_RATIO) growRatio = 1
        const rowHeight = Math.ceil(DESIRED_HEIGHT * growRatio)
        monthHeight += rowHeight + PHOTO_GAP
        rows.push({
          items: rowItems,
          height: rowHeight,
        })
        rowItems = []
        rowWidth = -PHOTO_GAP
      }
    }
    if (rowItems.length > 0) {
      let growRatio = containerWidth.value / rowWidth
      if (growRatio > MAX_GROW_RATIO) growRatio = 1
      if (growRatio < 0) console.warn({ growRatio, cw: containerWidth.value, rowWidth })
      const rowHeight = Math.ceil(DESIRED_HEIGHT * growRatio)
      monthHeight += rowHeight + PHOTO_GAP
      rows.push({
        items: rowItems,
        height: rowHeight,
      })
    }
    if (rows.length > 0) {
      newMonths.push({
        height: monthHeight,
        rows,
        id: month.month,
      })
      rows = []
      monthHeight = -PHOTO_GAP
    }
  }
  console.log({ newMonths })
  months.value = newMonths
}

watch(containerWidth, () => {
  // const now = performance.now()
  // // calculateGrid()
  // console.log('Resize watch, calc grid: ', performance.now() - now, 'ms')
})
</script>

<template>
  <div class="photo-grid-container" ref="photoGridContainer">
    <super-lazy
      :height="month.height + 88 + 'px'"
      margin="1500px"
      v-for="(month, k) in months"
      :key="k"
    >
      <month-view :month="month" :photo-gap="PHOTO_GAP"></month-view>
    </super-lazy>
  </div>
</template>

<style scoped></style>
