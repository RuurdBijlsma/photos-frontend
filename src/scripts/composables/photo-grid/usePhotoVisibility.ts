import { ref } from 'vue'
import type { TimelineStore } from '@/scripts/stores/timelineStore.ts'
import type { RowLayout } from '@/vues/components/photo-grid/GridRow.vue'

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
    const timeline = timelineStore.timeline
    if (!timeline) return

    const index = timelineStore.monthToIndex.get(id)
    if (index === undefined) return

    // Cache store values to avoid repeated Proxy access
    const mediaItems = timelineStore.mediaItems
    const mediaMonthsLoading = timelineStore.mediaMonthsLoading

    // Check if any month in the requested buffer range needs fetching
    const start = Math.max(0, index - buffer)
    const end = Math.min(timeline.length - 1, index + buffer)
    let needsFetch = false

    for (let i = start; i <= end; i++) {
      const m = timeline[i]
      if (!m) continue
      const mId = m.monthId
      if (!mediaItems.has(mId) && !mediaMonthsLoading.has(mId)) {
        needsFetch = true
        break
      }
    }

    if (!needsFetch) return

    // If we need to fetch, build a batch of items expanding from the center
    const TARGET_BATCH_SIZE = 500
    const toFetch = new Set<string>()
    let currentCount = 0
    let radius = 0
    const maxRadius = 50 // Safety break

    while (currentCount < TARGET_BATCH_SIZE) {
      const left = index - radius
      const right = index + radius

      if (left < 0 && right >= timeline.length) break

      // Process left and right indices
      // If radius is 0, left === right, so we only process one
      const indices = radius === 0 ? [left] : [left, right]

      for (const i of indices) {
        if (i < 0 || i >= timeline.length) continue

        const m = timeline[i]
        if (!m) continue

        const mId = m.monthId
        if (!mediaItems.has(mId) && !mediaMonthsLoading.has(mId)) {
          if (!toFetch.has(mId)) {
            toFetch.add(mId)
            currentCount += m.count
          }
        }
      }

      radius++
      if (radius > maxRadius && currentCount > 0) break
    }

    if (toFetch.size > 0) {
      await timelineStore.fetchMediaByMonths(Array.from(toFetch))
    }
  }

  return { handleIsVisible, rowInViewDate }
}
