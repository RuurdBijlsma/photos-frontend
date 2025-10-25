<script setup lang="ts">
import { ref, watch } from 'vue'
import { useElementSize } from '@vueuse/core'
import SuperLazy from '@/components/SuperLazy.vue'
import MonthView, {
  type LayoutItem,
  type MonthLayout,
  type RowLayout,
} from '@/components/photo-grid/MonthView.vue'
import type { MonthlyRatios } from '@/generated/ratios'
import { usePhotoStore } from '@/stores/photoStore'

const photoGridContainer = ref<HTMLElement | null>(null)
const { width: containerWidth } = useElementSize(photoGridContainer)
const photoStore = usePhotoStore()
const months = ref<MonthLayout[]>([])

const DESIRED_HEIGHT = 240
const PHOTO_GAP = 2
const MAX_GROW_RATIO = 1.5
const LOAD_BUFFER = 2

photoStore.fetchLayoutRatios().then(() => {
  let now = performance.now()
  if (photoStore.timeline.ratios) updateGrid(photoStore.timeline.ratios)
  console.log('updateGrid', performance.now() - now, 'ms')
})

function updateGrid(monthlyRatios: MonthlyRatios[]) {
  if (!containerWidth.value) return
  const newMonths: MonthLayout[] = []

  for (const { month, ratios } of monthlyRatios) {
    const rows: RowLayout[] = []
    let row: LayoutItem[] = []
    let rowWidth = -PHOTO_GAP
    let monthHeight = -PHOTO_GAP

    for (const [i, ratio] of ratios.entries()) {
      rowWidth += ratio * DESIRED_HEIGHT + PHOTO_GAP
      row.push({ ratio, index: i })

      if (rowWidth > containerWidth.value) {
        const grow = Math.min(containerWidth.value / rowWidth, MAX_GROW_RATIO)
        const rowHeight = Math.ceil(DESIRED_HEIGHT * grow)
        rows.push({ items: row, height: rowHeight })
        monthHeight += rowHeight + PHOTO_GAP
        row = []
        rowWidth = -PHOTO_GAP
      }
    }

    if (row.length) {
      const grow = Math.min(containerWidth.value / rowWidth, MAX_GROW_RATIO)
      const rowHeight = Math.ceil(DESIRED_HEIGHT * grow)
      rows.push({ items: row, height: rowHeight })
      monthHeight += rowHeight + PHOTO_GAP
    }

    newMonths.push({ id: month, rows, height: monthHeight })
  }

  months.value = newMonths
}

watch(containerWidth, () => {
  if (photoStore.timeline.ratios) updateGrid(photoStore.timeline.ratios)
})

let monthInView = ''
async function handleIsVisible(isVisible: boolean, id: string) {
  if (!isVisible) return
  monthInView = id
  loadAroundMonth(id, LOAD_BUFFER)
  setTimeout(() => monthInView === id && loadAroundMonth(id, LOAD_BUFFER * 3), 500)
  setTimeout(() => monthInView === id && loadAroundMonth(id, LOAD_BUFFER * 6), 2500)
}

async function loadAroundMonth(id: string, buffer: number) {
  const index = photoStore.timeline.months.indexOf(id)
  const toFetch = photoStore.timeline.months
    .slice(Math.max(0, index - buffer), index + buffer + 1)
    .filter((m) => !photoStore.months.has(m) && !photoStore.monthsLoading.has(m))

  if (toFetch.length) await photoStore.fetchMediaByMonths(toFetch)
}
</script>

<template>
  <div class="photo-grid-container" ref="photoGridContainer">
    <super-lazy
      v-for="m in months"
      :key="m.id"
      :height="m.height + 88 + 'px'"
      margin="10000px"
      @is-visible="(e) => handleIsVisible(e, m.id)"
    >
      <month-view :layout="m" :items="photoStore.months.get(m.id) ?? null" :photo-gap="PHOTO_GAP" />
    </super-lazy>
  </div>
</template>
