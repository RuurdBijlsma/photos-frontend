import { type Ref, watch } from 'vue'
import type { VVirtualScroll } from 'vuetify/components'
import type { RowLayout } from '@/vues/components/photo-grid/GridRow.vue'
import { useTimelineScroll } from '@/scripts/composables/photo-grid/useTimelineScroll.ts'
import type { SortDirection } from '@/scripts/types/api/album.ts'
import type { GenericTimeline } from '@/scripts/services/timeline/GenericTimeline.ts'

/**
 * Handles the bidirectional synchronization between the timeline:
 * 1. Scrolling the VirtualScroll when a global 'scrollToDate' is requested.
 * 2. Keeping the global 'dateInView' updated when the visible row changes.
 * 3. Triggering data loading as scrolling occurs.
 */
export function useTimelineScrollSync(
  virtualScrollRef: Ref<VVirtualScroll | null>,
  rows: Ref<RowLayout[]>,
  rowOffsets: Ref<number[]>,
  controller: GenericTimeline,
  sortDirection: SortDirection,
) {
  const { setDateInView, scrollToDate, clearScrollRequest, scrollTop } = useTimelineScroll()
  let currentMonthInView = ''

  // --- 1. Report Visible Date (Scroll Mapped) ---
  watch(scrollTop, (y) => {
    const offsets = rowOffsets.value
    if (offsets.length === 0) return

    // Binary search to find the row index
    let low = 0
    let high = offsets.length - 1
    let index = -1

    while (low <= high) {
      const mid = Math.floor((low + high) / 2)
      // Check if y is less than the bottom of this row
      if (offsets[mid]! > y) {
        index = mid
        high = mid - 1
      } else {
        low = mid + 1
      }
    }

    // Fallback if scrolled past the end
    if (index === -1) {
      if (y >= (offsets[offsets.length - 1] ?? 0)) {
        index = offsets.length - 1
      } else {
        return // Before start?
      }
    }

    const row = rows.value[index]
    if (row) {
      // 1a. Update Date In View
      if (row.items.length > 0 && row.monthId) {
        const mediaItems = controller.mediaItems.get(row.monthId)
        if (mediaItems) {
          const textDate = mediaItems[row.items[0]!.index]?.timestamp
          if (textDate) {
            setDateInView(new Date(textDate))
          }
        }
      }

      // 1b. Trigger Data Loading
      const id = row.monthId
      if (id && id !== currentMonthInView) {
        currentMonthInView = id
        loadAroundMonth(id, controller)
      }
    }
  })

  // --- 2. Handle External Scroll Requests ---
  watch(scrollToDate, (date) => {
    if (!date) return

    // 1. Find the first row of the target month
    const monthStr = (date.getMonth() + 1).toString().padStart(2, '0')
    const targetMonthId = `${date.getFullYear()}-${monthStr}-01`
    const startIndex = rows.value.findIndex((row) => row.monthId === targetMonthId)

    if (startIndex !== -1 && virtualScrollRef.value) {
      // Immediate feedback for the date overlay
      setDateInView(date)

      // 2. Calculate how many rows belong to this month
      let monthRowCount = 0
      for (let i = startIndex; i < rows.value.length; i++) {
        if (rows.value[i]!.monthId === targetMonthId) {
          monthRowCount++
        } else {
          break
        }
      }

      // 3. Calculate offset based on day of the month (approximate)
      const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
      const day = date.getDate()

      // ratio: 0.0 (start of month) -> 1.0 (end of month)
      const ratio = Math.min(1, Math.max(0, (day - 1) / (daysInMonth - 1 || 1)))

      let offset: number
      if (sortDirection === 'asc') {
        // Ascending: Day 1 is at top (offset 0)
        offset = Math.round((monthRowCount - 1) * ratio)
      } else {
        // Descending: Day 31 is at top (offset 0), Day 1 is at bottom
        offset = Math.round((monthRowCount - 1) * (1 - ratio))
      }

      virtualScrollRef.value.scrollToIndex(startIndex + offset)
    }

    clearScrollRequest()
  })

  async function loadAroundMonth(id: string, controller: GenericTimeline) {
    const CHECK_RADIUS = 2
    const BATCH_SIZE = 500

    const index = controller.monthToIndex.get(id)
    const timeline = controller.timeline
    if (index === undefined || !timeline) return

    const toFetch = new Set<string>()
    let count = 0
    let radius = 0
    let foundGap = false

    while (count < BATCH_SIZE && radius < 50) {
      if (!foundGap && radius > CHECK_RADIUS) break

      const indices = radius === 0 ? [index] : [index - radius, index + radius]

      for (const i of indices) {
        const month = timeline[i]
        if (!month) continue

        const { monthId, count: monthCount } = month
        const needsLoad =
          !controller.mediaItems.has(monthId) && !controller.mediaMonthsLoading.has(monthId)

        if (needsLoad) {
          if (radius <= CHECK_RADIUS) foundGap = true

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
}
