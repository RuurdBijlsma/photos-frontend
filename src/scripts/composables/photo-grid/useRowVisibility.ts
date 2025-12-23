import type { GenericTimeline } from '@/scripts/services/timeline/GenericTimeline.ts'
import { ref } from 'vue'
import type { RowLayout } from '@/vues/components/photo-grid/GridRow.vue'

export function useRowVisibility(controller: GenericTimeline) {
  const CHECK_RADIUS = 2
  const BATCH_SIZE = 500

  const monthInView = ref('')
  const rowInViewDate = ref<Date | null>(null)
  const rowInViewIndex = ref(-1)

  async function handleIsVisible(isVisible: boolean, row: RowLayout, rowIndex: number) {
    if (!isVisible) return
    rowInViewIndex.value = rowIndex

    const mediaItemIndex = row.items?.[0]?.index
    if (mediaItemIndex !== undefined) {
      const rowDateString = controller.mediaItems.get(row.monthId)?.[mediaItemIndex]?.timestamp
      if (rowDateString !== undefined) rowInViewDate.value = new Date(rowDateString)
    }

    const id = row.monthId
    if (id !== monthInView.value) {
      monthInView.value = id
      await loadAroundMonth(id, CHECK_RADIUS, BATCH_SIZE)
      requestIdleCallback(
        () => monthInView.value === id && loadAroundMonth(id, CHECK_RADIUS * 5, BATCH_SIZE * 2),
      )
    }
  }

  async function loadAroundMonth(id: string, checkRadius: number, batchSize: number) {
    const index = controller.monthToIndex.get(id)
    const timeline = controller.timeline
    if (index === undefined || !timeline) return

    const toFetch = new Set<string>()
    let count = 0
    let radius = 0
    let foundGap = false

    while (count < batchSize && radius < 50) {
      if (!foundGap && radius > checkRadius) break

      const indices = radius === 0 ? [index] : [index - radius, index + radius]

      for (const i of indices) {
        const month = timeline[i]
        if (!month) continue

        const { monthId, count: monthCount } = month
        const needsLoad =
          !controller.mediaItems.has(monthId) && !controller.mediaMonthsLoading.has(monthId)

        if (needsLoad) {
          if (radius <= checkRadius) foundGap = true

          if (foundGap) {
            toFetch.add(monthId)
            count += monthCount
          }
        }
      }
      radius++
    }

    if (toFetch.size > 0) {
      await controller.fetchMediaByMonths(Array.from(toFetch))
    }
  }

  return { handleIsVisible, rowInViewDate, rowInViewIndex }
}
