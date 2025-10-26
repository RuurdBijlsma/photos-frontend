<script setup lang="ts">
import { ref, watch } from 'vue'
import { useElementSize } from '@vueuse/core'
import { usePhotoStore } from '@/stores/photoStore'
import GridItem from '@/components/photo-grid/GridItem.vue'
import type { TimelineMonth } from '@/generated/photos'

export interface LayoutItem {
  ratio: number
  index: number
  key: string
}

export interface RowLayout {
  items: LayoutItem[]
  monthId: string
  height: number
  firstOfTheMonth: boolean
}

const photoGridContainer = ref<HTMLElement | null>(null)
const { width: containerWidth, height: containerHeight } = useElementSize(photoGridContainer)
const photoStore = usePhotoStore()
const rows = ref<RowLayout[]>([])

const DESIRED_HEIGHT = 240
const PHOTO_GAP = 2
const MAX_GROW_RATIO = 1.5
const LOAD_BUFFER = 2

photoStore.fetchTimeline().then(() => {
  const now = performance.now()
  if (photoStore.timeline) updateGrid(photoStore.timeline)
  console.log('updateGrid', performance.now() - now, 'ms')
})

function updateGrid(timelineMonths: TimelineMonth[]) {
  if (!containerWidth.value) return
  const newRows: RowLayout[] = []

  for (const { monthId, ratios } of timelineMonths) {
    let row: LayoutItem[] = []
    let rowWidth = -PHOTO_GAP
    let firstOfTheMonth = true

    for (const [i, ratio] of ratios.entries()) {
      rowWidth += ratio * DESIRED_HEIGHT + PHOTO_GAP
      row.push({ ratio, index: i, key: monthId + i })

      if (rowWidth > containerWidth.value) {
        const grow = Math.min(containerWidth.value / rowWidth, MAX_GROW_RATIO)
        const rowHeight = Math.ceil(DESIRED_HEIGHT * grow)
        newRows.push({ items: row, height: rowHeight, firstOfTheMonth, monthId })
        firstOfTheMonth = false
        row = []
        rowWidth = -PHOTO_GAP
      }
    }

    if (row.length) {
      const grow = Math.min(containerWidth.value / rowWidth, MAX_GROW_RATIO)
      const rowHeight = Math.ceil(DESIRED_HEIGHT * grow)
      newRows.push({ items: row, height: rowHeight, monthId, firstOfTheMonth })
    }
  }

  rows.value = newRows
}

watch(containerWidth, () => {
  if (photoStore.timeline) updateGrid(photoStore.timeline)
})

let monthInView = ''
async function handleIsVisible(isVisible: boolean, id: string) {
  if (!isVisible) return
  if (id !== monthInView) {
    console.log('Call funcies')
    monthInView = id
    loadAroundMonth(id, LOAD_BUFFER)
    requestIdleCallback(() => monthInView === id && loadAroundMonth(id, LOAD_BUFFER * 5))
  }
}

async function loadAroundMonth(id: string, buffer: number) {
  const index = photoStore.timelineMonths.indexOf(id)
  const toFetch = photoStore.timelineMonths
    .slice(Math.max(0, index - buffer), index + buffer + 1)
    .filter((m) => !photoStore.mediaItems.has(m) && !photoStore.mediaMonthsLoading.has(m))

  if (toFetch.length) await photoStore.fetchMediaByMonths(toFetch)
}
</script>

<template>
  <div class="photo-grid-container" ref="photoGridContainer">
    <v-virtual-scroll
      :items="rows"
      :height="containerHeight"
      item-key="key"
      class="scroll-container"
    >
      <template v-slot:default="{ item }">
        <h1 class="month-title" v-if="item.firstOfTheMonth">{{ item.monthId }}</h1>
        <div
          v-intersect="(e: boolean) => handleIsVisible(e, item.monthId)"
          class="row"
          :style="{
            height: item.height + PHOTO_GAP + 'px',
          }"
        >
          <grid-item
            v-for="ratio in item.items"
            :key="ratio.index"
            :media-item="photoStore.mediaItems.get(item.monthId)?.[ratio.index]"
            :height="item.height"
            :width="item.height * ratio.ratio"
          />
        </div>
      </template>
    </v-virtual-scroll>
  </div>
</template>

<style scoped>
.scroll-container {
  padding-bottom: 10px;
  overflow: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.scroll-container::-webkit-scrollbar {
  width: 0;
  height: 0;
  background: transparent;
}

.row {
  display: flex;
  gap: v-bind(PHOTO_GAP + 'px');
}

.month-title {
  padding: 20px 0 20px 15px;
  margin-left: 20px;
}
</style>
