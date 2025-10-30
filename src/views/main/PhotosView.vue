<script setup lang="ts">
import { computed, type ComputedRef, onMounted, onUnmounted, ref, watch } from 'vue'
import { usePhotoStore } from '@/stores/photoStore'
import type { TimelineMonth } from '@/generated/photos'
import GridRow, { type RowLayout } from '@/components/photo-grid/GridRow.vue'
import type { LayoutItem } from 'vuetify/lib/composables/layout'
import GridRowHeader from '@/components/photo-grid/GridRowHeader.vue'
import { CURRENT_YEAR, DAYS, MONTHS } from '@/script/constants.ts'
import { useDebounceFn } from '@vueuse/core'

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
async function handleIsVisible(isVisible: boolean, row: RowLayout) {
  if (!isVisible) return
  const rowDateString = photoStore.mediaItems.get(row.monthId)?.[row.items?.[0]?.index]?.timestamp
  if (rowDateString !== undefined) rowInViewDate.value = new Date(rowDateString)

  const id = row.monthId
  if (id !== monthInView) {
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

const hoverDate = ref<Date | null>(null)
const rowInViewDate = ref<Date | null>(null)

const dateInViewString: ComputedRef<{ date: string; year: null | string } | null> = computed(() => {
  const date =
    scrollOverride.value || hoverDate.value === null ? rowInViewDate.value : hoverDate.value
  if (date === null) return null
  const day = DAYS[date.getDay()]!
  const month = MONTHS[date.getMonth()]!
  const year = date.getFullYear() === CURRENT_YEAR ? null : ' ' + date.getFullYear()
  return { date: `${day.substring(0, 3)}, ${date.getDate()} ${month.substring(0, 3)}`, year }
})

const scrollOverride = ref(false)
const restoreOverride = useDebounceFn(() => (scrollOverride.value = false), 500)
function activateScrollOverride() {
  scrollOverride.value = true
  restoreOverride()
}
</script>

<template>
  <div class="photo-grid-container" ref="photoGridContainer">
    <div class="date-view" v-if="dateInViewString">
      <span class="date-view-date">{{ dateInViewString.date }}</span
      ><span class="date-view-year" v-if="dateInViewString.year">{{ dateInViewString.year }}</span>
    </div>
    <v-virtual-scroll
      @scroll="activateScrollOverride"
      :items="rows"
      :height="containerHeight"
      item-key="key"
      class="scroll-container"
    >
      <template v-slot:default="{ item }">
        <grid-row-header v-if="item.firstOfTheMonth" :row="item" />
        <grid-row
          @hover-item="(date) => (hoverDate = date)"
          :photo-gap="PHOTO_GAP"
          :media-items="photoStore.mediaItems.get(item.monthId)"
          :row="item"
          v-intersect="(e: boolean) => handleIsVisible(e, item)"
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

.date-view {
  position: absolute;
  top: 30px;
  right: 30px;
  padding: 20px 40px;
  z-index: 3;
  text-align: left;
  font-weight: 500;
  border-radius: 40px;
  background-color: rgba(var(--v-theme-surface-container-highest), 0.5);
  color: rgba(var(--v-theme-on-surface), 1);
  box-shadow:
    0 4px 8px 0 rgba(0, 0, 0, 0.2),
    0 6px 20px 0 rgba(0, 0, 0, 0.19);
  backdrop-filter: saturate(150%) brightness(70%) blur(20px) contrast(100%);
}

.date-view-date {
  font-weight: 700;
  font-size: 22px;
  margin-right: 20px;
}
.date-view-year {
  font-weight: 400;
  font-size: 16px;
}
</style>
