<script setup lang="ts">
import { type Ref, ref, watch } from 'vue'
import { useElementSize } from '@vueuse/core'
import SuperLazy from '@/components/SuperLazy.vue'
import photoService from '@/script/services/photoService.ts'
import { AllPhotoRatiosResponse } from '@/generated/ratios.ts'

const photoGridContainer = ref<HTMLElement | null>(null)
const { width: containerWidth } = useElementSize(photoGridContainer)

const startup =async () => {
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

const months: Ref<any[]> = ref([])

const DESIRED_HEIGHT = 240
const PHOTO_GAP = 2
const MAX_GROW_RATIO = 1.5

function calculateGrid(photos: AllPhotoRatiosResponse) {
  if (containerWidth.value === 0) return
  const newMonths = []
  let rows = []
  let monthHeight = -PHOTO_GAP
  for (const month of photos.months) {
    let rowWidth = -PHOTO_GAP
    let rowItems = []
    for (const ratio of month.ratios) {
      const photoWidth = ratio * DESIRED_HEIGHT
      rowWidth += photoWidth + PHOTO_GAP
      rowItems.push(ratio)

      if (rowWidth > containerWidth.value) {
        let growRatio = containerWidth.value / rowWidth
        if (growRatio > MAX_GROW_RATIO) growRatio = 1
        if (growRatio > MAX_GROW_RATIO) growRatio = 1
        const rowHeight = Math.ceil(DESIRED_HEIGHT * growRatio)
        monthHeight += rowHeight + PHOTO_GAP
        rows.push({
          ratios: rowItems,
          rowHeight,
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
        ratios: rowItems,
        rowHeight,
      })
    }
    if (rows.length > 0) {
      newMonths.push({
        height: monthHeight,
        rows,
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
      class="month"
    >
      <h1 class="ml-10">Month {{ k }}</h1>
      <super-lazy
        :height="row.rowHeight + PHOTO_GAP + 'px'"
        margin="1000px"
        v-for="(row, n) in month.rows"
        :key="n"
        class="row"
      >
        <div
          class="item"
          v-for="(ratio, j) in row.ratios"
          :key="j"
          :style="{
            backgroundColor: 'black',
            width: row.rowHeight * ratio + 'px',
            height: row.rowHeight + 'px',
          }"
        >
          <img
            src="http://localhost:9475/thumbnails/_aIBG7n2c_/360p.avif"
            :height="row.rowHeight"
            :width="row.rowHeight * ratio"
          />
        </div>
      </super-lazy>
    </super-lazy>
  </div>
</template>

<style scoped>
.row {
  display: flex;
  gap: 2px;
}

.month h1 {
  padding: 20px 0 20px 15px;
}
</style>
