import { type Ref, ref, watch } from 'vue'
import type { TimelineMonth } from '@/generated/photos.ts'
import type { RowLayout, LayoutItem } from '@/components/photo-grid/GridRow.vue'
import type { PhotoStore } from '@/stores/photoStore.ts'

export function usePhotoGrid(containerWidth: Ref<number>, photoStore: PhotoStore) {
  const rows = ref<RowLayout[]>([])
  const DESIRED_HEIGHT = 240
  const PHOTO_GAP = 2
  const MAX_GROW_RATIO = 1.5

  function updateGrid(timelineMonths: TimelineMonth[]) {
    if (!containerWidth.value) return
    const newRows: RowLayout[] = []

    for (const { monthId, ratios } of timelineMonths) {
      let row: LayoutItem[] = []
      let rowWidth = -PHOTO_GAP
      let firstOfTheMonth = true

      for (const [i, ratio] of ratios.entries()) {
        rowWidth += ratio * DESIRED_HEIGHT + PHOTO_GAP
        row.push({ ratio, index: i })
        if (rowWidth > containerWidth.value) {
          const grow = Math.min(containerWidth.value / rowWidth, MAX_GROW_RATIO)
          newRows.push({
            items: row,
            height: Math.ceil(DESIRED_HEIGHT * grow),
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
        newRows.push({
          items: row,
          height: Math.ceil(DESIRED_HEIGHT * grow),
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

  return { rows, updateGrid, PHOTO_GAP }
}
