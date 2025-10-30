<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { usePhotoStore } from '@/stores/photoStore'
import type { TimelineMonth } from '@/generated/photos'
import GridRow, { type RowLayout } from '@/components/photo-grid/GridRow.vue'
import type { LayoutItem } from 'vuetify/lib/composables/layout'
import GridRowHeader from '@/components/photo-grid/GridRowHeader.vue'

const photoGridContainer = ref<HTMLElement | null>(null)
const containerWidth = ref(0)
const containerHeight = ref(0)
const onWindowResize = () => {
  const element = photoGridContainer.value
  if (!element) return
  const box = element.getBoundingClientRect()
  containerWidth.value = box.width
  containerHeight.value = box.height
}
onMounted(() => {
  window.addEventListener('resize', onWindowResize)
  requestIdleCallback(onWindowResize)
})
onUnmounted(() => {
  window.removeEventListener('resize', onWindowResize)
})

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
        newRows.push({
          items: row,
          height: rowHeight,
          monthId,
          firstOfTheMonth,
          lastOfTheMonth: i === ratios.length - 1,
        })
        firstOfTheMonth = false
        row = []
        rowWidth = -PHOTO_GAP
      }
    }

    if (row.length) {
      const grow = Math.min(containerWidth.value / rowWidth, MAX_GROW_RATIO)
      const rowHeight = Math.ceil(DESIRED_HEIGHT * grow)
      newRows.push({
        items: row,
        height: rowHeight,
        monthId,
        firstOfTheMonth,
        lastOfTheMonth: true,
      })
    }
  }

  rows.value = newRows
}

watch(containerWidth, () => {
  if (photoStore.timeline) updateGrid(photoStore.timeline)
})
watch(
  () => photoStore.timelineMonths,
  () => {
    if (photoStore.timeline) updateGrid(photoStore.timeline)
  },
)

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
        <grid-row-header v-if="item.firstOfTheMonth" :row="item" />
        <grid-row
          :photo-gap="PHOTO_GAP"
          :media-items="photoStore.mediaItems.get(item.monthId)"
          :row="item"
          v-intersect="(e: boolean) => handleIsVisible(e, item.monthId)"
        />
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
</style>
