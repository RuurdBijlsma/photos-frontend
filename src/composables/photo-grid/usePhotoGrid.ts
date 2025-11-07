import { type Ref, ref, watch } from 'vue'
import type { TimelineMonth } from '@/generated/photos.ts'
import type { LayoutItem, RowLayout } from '@/components/photo-grid/GridRow.vue'
import type { TimelineStore } from '@/stores/timelineStore.ts'
import type { SettingsStore } from '@/stores/settingsStore.ts'

export function usePhotoGrid(
  containerWidthRef: Ref<number>,
  settings: SettingsStore,
  timelineStore: TimelineStore,
) {
  const rows = ref<RowLayout[]>([])
  const PHOTO_GAP = 2
  const MAX_GROW_RATIO = 1.5

  function updateGrid(
    timelineMonths: TimelineMonth[],
    desiredRowHeight: number,
    containerWidth: number,
  ) {
    const newRows: RowLayout[] = []

    for (const { monthId, ratios } of timelineMonths) {
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
        })
      }
    }

    rows.value = newRows
  }

  watch(
    () => settings.timelineRowHeight,
    () => {
      if (timelineStore.timeline)
        updateGrid(timelineStore.timeline, settings.timelineRowHeight, containerWidthRef.value)
    },
  )

  watch(containerWidthRef, () => {
    if (timelineStore.timeline)
      updateGrid(timelineStore.timeline, settings.timelineRowHeight, containerWidthRef.value)
  })

  watch(
    () => timelineStore.timeline,
    () => {
      if (timelineStore.timeline)
        updateGrid(timelineStore.timeline, settings.timelineRowHeight, containerWidthRef.value)
    },
  )

  return { rows, updateGrid, PHOTO_GAP }
}
