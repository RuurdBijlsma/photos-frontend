import { type Ref, shallowRef, watch } from 'vue'
import type { LayoutItem, RowLayout } from '@/vues/components/photo-grid/GridRow.vue'
import type { SettingsStore } from '@/scripts/stores/settingsStore.ts'
import type { GenericTimeline } from '@/scripts/services/timeline/GenericTimeline.ts'
import type { TimelineMonthRatios } from '@/scripts/types/generated/timeline.ts'

export function usePhotoGrid(
  containerWidthRef: Ref<number>,
  settings: SettingsStore,
  controller: GenericTimeline,
) {
  const rows = shallowRef<RowLayout[]>([])
  const PHOTO_GAP = 2
  const MAX_GROW_RATIO = 1.5

  function updateGrid(
    ratiosByMonth: TimelineMonthRatios[],
    desiredRowHeight: number,
    containerWidth: number,
  ) {
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
  }

  watch(
    () => settings.timelineRowHeight,
    () => {
      const timeline = controller.timeline
      if (timeline) {
        const now = performance.now()
        updateGrid(timeline, settings.timelineRowHeight, containerWidthRef.value)
        console.log('updateGrid', performance.now() - now)
      }
    },
  )

  watch(containerWidthRef, () => {
    const timeline = controller.timeline
    if (timeline) {
      const now = performance.now()
      updateGrid(timeline, settings.timelineRowHeight, containerWidthRef.value)
      console.log('updateGrid', performance.now() - now)
    }
  })

  watch(
    () => controller.timeline,
    () => {
      const timeline = controller.timeline
      if (timeline) {
        const now = performance.now()
        updateGrid(timeline, settings.timelineRowHeight, containerWidthRef.value)
        console.log('updateGrid', performance.now() - now)
      }
    },
  )

  return { rows, updateGrid, PHOTO_GAP }
}
