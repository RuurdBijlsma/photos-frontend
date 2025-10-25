<script setup lang="ts">
import { type Ref, ref, watch } from 'vue'
import { useElementSize } from '@vueuse/core'
import SuperLazy from '@/components/SuperLazy.vue'
import MonthView, {
  type LayoutItem,
  type MonthLayout,
  type RowLayout,
} from '@/components/photo-grid/MonthView.vue'
import type { MonthlyRatios } from '@/generated/ratios.ts'
import { usePhotoStore } from '@/stores/photoStore.ts'

const photoGridContainer = ref<HTMLElement | null>(null)
const { width: containerWidth } = useElementSize(photoGridContainer)
const photoStore = usePhotoStore()
const months: Ref<MonthLayout[]> = ref([])

const DESIRED_HEIGHT = 240
const PHOTO_GAP = 2
const MAX_GROW_RATIO = 1.5
const LOADED_MONTH_BUFFER = 2

photoStore.fetchLayoutRatios().then(() => {
  const now = performance.now()
  if (photoStore.timeline.ratios !== null) calculateGrid(photoStore.timeline.ratios)
  console.log('Initial, calc grid: ', performance.now() - now, 'ms')
})

function calculateGrid(monthlyRatios: MonthlyRatios[]) {
  if (containerWidth.value === 0) return
  const newMonths: MonthLayout[] = []
  let rows: RowLayout[] = []
  let monthHeight = -PHOTO_GAP
  for (const month of monthlyRatios) {
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
  const now = performance.now()
  if (photoStore.timeline.ratios !== null) calculateGrid(photoStore.timeline.ratios)
  console.log('Resize -> calc grid: ', performance.now() - now, 'ms')
})

let monthInView: string = ''
function handleIsVisible(isVisible: boolean, monthId: string) {
  if (!isVisible) return
  monthInView = monthId
  fetchAroundMonthId(monthId, LOADED_MONTH_BUFFER).then(() => {
    setTimeout(() => {
      if (monthInView === monthId) fetchAroundMonthId(monthInView, LOADED_MONTH_BUFFER * 3)
    }, 500)
    setTimeout(() => {
      if (monthInView === monthId) fetchAroundMonthId(monthInView, LOADED_MONTH_BUFFER * 6)
    }, 2500)
  })
}

watch(
  () => photoStore.months,
  () => {
    console.log('loaded months', photoStore.months.keys())
  },
  { deep: true },
)

async function fetchAroundMonthId(monthId: string, load_buffer: number = 2) {
  const monthIndex = photoStore.timeline.months.indexOf(monthId)
  const monthsToFetch: string[] = []
  for (let i = -load_buffer; i <= load_buffer; i++) {
    const fetchIndex = monthIndex + i
    if (fetchIndex >= 0 && fetchIndex < photoStore.timeline.months.length) {
      const monthId = photoStore.timeline.months[fetchIndex]
      if (
        monthId !== undefined &&
        !photoStore.months.has(monthId) &&
        !photoStore.monthsLoading.has(monthId)
      ) {
        monthsToFetch.push(monthId)
      }
    }
  }
  if (monthsToFetch.length > 0) {
    const now = performance.now()
    await photoStore.fetchMediaByMonths(monthsToFetch)
    console.log('fetchMediaByMonths took', performance.now() - now, 'ms')
  }
}
</script>

<template>
  <div class="photo-grid-container" ref="photoGridContainer">
    <super-lazy
      :height="month.height + 88 + 'px'"
      margin="10000px"
      v-for="month in months"
      :key="month.id"
      @is-visible="(e) => handleIsVisible(e, month.id)"
    >
      <month-view
        :layout="month"
        :items="photoStore.months.get(month.id) ?? null"
        :photo-gap="PHOTO_GAP"
      />
    </super-lazy>
  </div>
</template>

<style scoped></style>
