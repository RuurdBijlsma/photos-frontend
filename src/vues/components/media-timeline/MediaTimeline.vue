<script setup lang="ts">
import DateOverlay from '@/vues/components/media-timeline/DateOverlay.vue'
import { useDateOverlay } from '@/scripts/composables/photo-grid/useDateOverlay.ts'
import { useRowVisibility } from '@/scripts/composables/photo-grid/useRowVisibility.ts'
import { usePhotoGrid } from '@/scripts/composables/photo-grid/usePhotoGrid.ts'
import { useContainerResize } from '@/scripts/composables/photo-grid/useContainerResize.ts'
import GridRowHeader from '@/vues/components/photo-grid/GridRowHeader.vue'
import GridRow from '@/vues/components/photo-grid/GridRow.vue'
import { useSettingStore } from '@/scripts/stores/settingsStore.ts'
import { ref, watch } from 'vue'
import { useTimelineScroll } from '@/scripts/composables/photo-grid/useTimelineScroll.ts'
import type { VVirtualScroll } from 'vuetify/components'
import type { GenericTimeline } from '@/scripts/services/timeline/GenericTimeline.ts'
import MainLayoutContainer from '@/vues/components/MainLayoutContainer.vue'
import { useSelectionStore } from '@/scripts/stores/selectionStore.ts'

const props = withDefaults(
  defineProps<{
    timelineController: GenericTimeline
    sortOrder?: 'asc' | 'desc'
  }>(),
  {
    sortOrder: 'desc',
  },
)

const settings = useSettingStore()
const selectionStore = useSelectionStore()

const { setDateInView, scrollToDate, clearScrollRequest, setIsAtTop } = useTimelineScroll()
const { container, width, height } = useContainerResize()
const { rows, PHOTO_GAP } = usePhotoGrid(width, settings, props.timelineController)
const { handleIsVisible, rowInViewDate } = useRowVisibility(props.timelineController)
const { hoverDate, dateInViewString, activateScrollOverride } = useDateOverlay(rowInViewDate)

const virtualScrollRef = ref<VVirtualScroll | null>(null)

// --- Selection State ---
const anchorId = ref<string | null>(null)
// We track the IDs involved in the previous shift operation to know what to deselect if the user shrinks the range
const lastShiftedIds = ref<Set<string>>(new Set())

watch(rowInViewDate, () => {
  setDateInView(rowInViewDate.value)
})

// Handle scroll requests from TimelineScroll
watch(scrollToDate, (date) => {
  if (!date) return

  const monthStr = (date.getMonth() + 1).toString().padStart(2, '0')
  const targetMonthId = `${date.getFullYear()}-${monthStr}-01`
  const startIndex = rows.value.findIndex((row) => row.monthId === targetMonthId)

  if (startIndex !== -1 && virtualScrollRef.value) {
    rowInViewDate.value = date
    setDateInView(date)

    let monthRowCount = 0
    for (let i = startIndex; i < rows.value.length; i++) {
      if (rows.value[i]!.monthId === targetMonthId) {
        monthRowCount++
      } else {
        break
      }
    }

    const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
    const day = date.getDate()
    const ratio = Math.min(1, Math.max(0, (day - 1) / (daysInMonth - 1 || 1)))
    let offset: number
    if (props.sortOrder === 'asc') {
      offset = Math.round((monthRowCount - 1) * ratio)
    } else {
      offset = Math.round((monthRowCount - 1) * (1 - ratio))
    }
    virtualScrollRef.value.scrollToIndex(startIndex + offset)
  }

  clearScrollRequest()
})

function handleScroll(e: WheelEvent) {
  activateScrollOverride(e)
  const target = e.target as HTMLElement
  if (target) {
    setIsAtTop(target.scrollTop < 5)
  }
}

function selectItem(e: PointerEvent, id: string) {
  // 1. Shift Selection Logic
  if (e.shiftKey && anchorId.value) {
    const currentIndex = props.timelineController.ids.indexOf(id)
    const anchorIndex = props.timelineController.ids.indexOf(anchorId.value)

    if (currentIndex !== -1 && anchorIndex !== -1) {
      const start = Math.min(currentIndex, anchorIndex)
      const end = Math.max(currentIndex, anchorIndex)

      // Get the new range of IDs
      const newRange = props.timelineController.ids.slice(start, end + 1)
      const newRangeSet = new Set(newRange)

      // DESELECT: items that were in the last shift operation but are NOT in the new range
      // (This happens when the user shrinks the selection back towards the anchor)
      const idsToDeselect: string[] = []
      lastShiftedIds.value.forEach(oldId => {
        if (!newRangeSet.has(oldId)) {
          idsToDeselect.push(oldId)
        }
      })

      if (idsToDeselect.length > 0) {
        // Assuming your store has a deselectMany, otherwise loop toggle
        if (selectionStore.deselectMany) {
          selectionStore.deselectMany(idsToDeselect)
        } else {
          // Fallback if store doesn't have bulk deselect
          idsToDeselect.forEach(dId => selectionStore.toggleSelected(dId))
        }
      }

      // SELECT: The new range
      selectionStore.selectMany(newRange)

      // Update history for the next click
      lastShiftedIds.value = newRangeSet
    }
  }
  // 2. Normal / Ctrl Selection Logic
  else {
    selectionStore.toggleSelected(id)

    // Set the Anchor
    anchorId.value = id

    // Clear the shift history because we started a new selection block
    lastShiftedIds.value.clear()
  }
}
</script>

<template>
  <main-layout-container>
    <date-overlay :date="dateInViewString" />
    <div class="photo-grid-container" ref="container">
      <v-virtual-scroll
        ref="virtualScrollRef"
        @scroll="handleScroll"
        :items="rows"
        :height="height"
        item-key="key"
        class="scroll-container"
      >
        <template #default="{ item }">
          <grid-row-header v-if="item.firstOfTheMonth" :row="item" />
          <grid-row
            @selection-click="payload => selectItem(payload.event, payload.id)"
            @hover-item="(date) => (hoverDate = date)"
            :photo-gap="PHOTO_GAP"
            :media-items="timelineController.mediaItems.get(item.monthId)"
            :row="item"
            v-intersect="(e: boolean) => handleIsVisible(e, item)"
          />
        </template>
      </v-virtual-scroll>
    </div>
  </main-layout-container>
  <teleport to="body">
    <router-view :ids="timelineController.ids" :fetch-ids="timelineController.fetchIds" />
  </teleport>
</template>

<style scoped>
.photo-grid-container {
  height: calc(100% + 7px);
  margin-top: -7px;
}

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
