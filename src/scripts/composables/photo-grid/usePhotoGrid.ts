import { type Ref, shallowRef, watch, unref } from 'vue'
import type { LayoutItem, RowLayout } from '@/vues/components/photo-grid/GridRow.vue'
import type { SettingsStore } from '@/scripts/stores/settingsStore.ts'
import type { GenericTimeline } from '@/scripts/services/timeline/GenericTimeline.ts'
import type { TimelineMonthRatios } from '@/scripts/types/generated/timeline.ts'

export function usePhotoGrid(
  containerWidthRef: Ref<number>,
  settings: SettingsStore,
  controllerRef: Ref<GenericTimeline>,
) {
  const rows = shallowRef<RowLayout[]>([])
  const rowOffsets = shallowRef<number[]>([])
  const PHOTO_GAP = 2
  const MAX_GROW_RATIO = 1.5

  function updateGrid(
    ratiosByMonth: TimelineMonthRatios[],
    desiredRowHeight: number,
    containerWidth: number,
  ) {
    console.warn('Update photo grid')
    // todo: this is weird
    containerWidth -= 7
    const newRows: RowLayout[] = []

    for (const { monthId, ratios } of ratiosByMonth) {
      let row: LayoutItem[] = []
      let rowWidth = -PHOTO_GAP
      let firstOfTheMonth = true

      for (const [i, ratio] of ratios.entries()) {
        rowWidth += ratio * desiredRowHeight + PHOTO_GAP
        row.push({ ratio, index: i })
        if (rowWidth > containerWidth) {
          const grow = Math.min(containerWidth / rowWidth, MAX_GROW_RATIO)
          newRows.push({
            items: row,
            height: Math.ceil(desiredRowHeight * grow),
            monthId,
            firstOfTheMonth,
            lastOfTheMonth: i === ratios.length - 1,
            key: `${monthId}-${newRows.length}`,
          })
          firstOfTheMonth = false
          row = []
          rowWidth = -PHOTO_GAP
        }
      }

      if (row.length) {
        const grow = Math.min(containerWidth / rowWidth, MAX_GROW_RATIO)
        newRows.push({
          items: row,
          height: Math.ceil(desiredRowHeight * grow),
          monthId,
          firstOfTheMonth,
          lastOfTheMonth: true,
          key: `${monthId}-${newRows.length}`,
        })
      }
    }

    rows.value = newRows

    // Calculate row offsets
    // 78 is the hardcoded height of GridRowHeader
    let cumulativeHeight = 0
    const offsets: number[] = []

    for (const row of newRows) {
      if (row.firstOfTheMonth) cumulativeHeight += 78
      cumulativeHeight += row.height + PHOTO_GAP
      offsets.push(cumulativeHeight)
    }
    console.log({offsets})
    rowOffsets.value = offsets
  }

  // Consolidated Watcher:
  // This watches the reactive path to the timeline.
  // If controllerRef changes OR if .timeline inside it changes, this fires.
  watch(
    [
      () => settings.timelineRowHeight,
      containerWidthRef,
      () => unref(controllerRef).timeline, // Access timeline on the CURRENT controller
    ],
    ([rowHeight, width, timeline]) => {
      // This handles your "prefetch" issue automatically.
      // 1. Controller swaps -> timeline is null -> does nothing.
      // 2. PreFetch finishes -> timeline becomes array -> updateGrid runs.
      if (timeline && width > 0) {
        updateGrid(timeline, rowHeight, width)
      }
    },
    { immediate: true },
  )

  return { rows, rowOffsets, updateGrid, PHOTO_GAP }
}
