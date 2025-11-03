import { ref } from 'vue'
import type { TimelineStore } from '@/stores/timelineStore.ts'
import type { RowLayout } from '@/components/photo-grid/GridRow.vue'

export function usePhotoVisibility(timelineStore: TimelineStore) {
  const monthInView = ref('')
  const rowInViewDate = ref<Date | null>(null)
  const LOAD_BUFFER = 2

  async function handleIsVisible(isVisible: boolean, row: RowLayout) {
    if (!isVisible) return

    const mediaItemIndex = row.items?.[0]?.index
    if (mediaItemIndex !== undefined) {
      const rowDateString = timelineStore.mediaItems.get(row.monthId)?.[mediaItemIndex]?.timestamp
      if (rowDateString !== undefined) rowInViewDate.value = new Date(rowDateString)
    }

    const id = row.monthId
    if (id !== monthInView.value) {
      monthInView.value = id
      await loadAroundMonth(id, LOAD_BUFFER)
      requestIdleCallback(() => monthInView.value === id && loadAroundMonth(id, LOAD_BUFFER * 5))
    }
  }

  async function loadAroundMonth(id: string, buffer: number) {
    const index = timelineStore.timelineMonths.indexOf(id)
    const toFetch = timelineStore.timelineMonths
      .slice(Math.max(0, index - buffer), index + buffer + 1)
      .filter(
        (m: string) => !timelineStore.mediaItems.has(m) && !timelineStore.mediaMonthsLoading.has(m),
      )

    if (toFetch.length) await timelineStore.fetchMediaByMonths(toFetch)
  }

  return { handleIsVisible, rowInViewDate }
}
