import { type Ref, watch } from 'vue'
import type { VVirtualScroll } from 'vuetify/components'
import type { RowLayout } from '@/vues/components/photo-grid/GridRow.vue'
import { useTimelineScroll } from '@/scripts/composables/photo-grid/useTimelineScroll.ts'
import type { SortDirection } from '@/scripts/types/api/album.ts'

/**
 * Handles the bidirectional synchronization between the timeline:
 * 1. Scrolling the VirtualScroll when a global 'scrollToDate' is requested.
 * 2. Reporting 'isAtTop' state based on scroll events.
 * 3. Keeping the global 'dateInView' updated when the visible row changes.
 */
export function useTimelineScrollSync(
  virtualScrollRef: Ref<VVirtualScroll | null>,
  rows: Ref<RowLayout[]>,
  rowInViewDate: Ref<Date | null>,
  sortDirection: SortDirection,
  activateScrollOverride: (e: WheelEvent) => void,
) {
  const { setDateInView, scrollToDate, clearScrollRequest, setIsAtTop } = useTimelineScroll()

  // --- 1. Report Visible Date ---
  watch(rowInViewDate, () => {
    setDateInView(rowInViewDate.value)
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
      rowInViewDate.value = date
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

  // --- 3. Handle User Scroll Events ---
  function handleScroll(e: WheelEvent) {
    // Notify overlay to stick the date
    activateScrollOverride(e)

    // Update 'Is At Top' state for sticky headers/navs
    const target = e.target as HTMLElement
    if (target) {
      setIsAtTop(target.scrollTop < 5)
    }
  }

  return { handleScroll }
}
