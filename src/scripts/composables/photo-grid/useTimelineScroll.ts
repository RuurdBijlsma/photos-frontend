import { ref, type Ref } from 'vue'

/**
 * Shared state for timeline scroll communication between TimelineView and TimelineScroll.
 * This composable provides a bridge for:
 * - TimelineView to report what date is currently in view
 * - TimelineScroll to request scrolling to a specific date
 */

const dateInView = ref<Date | null>(null)
const scrollToDate = ref<Date | null>(null)

export function useTimelineScroll() {
  /**
   * Set the date currently in view (called by TimelineView)
   */
  function setDateInView(date: Date | null) {
    dateInView.value = date
  }

  /**
   * Request to scroll to a specific date (called by TimelineScroll)
   */
  function requestScrollToDate(date: Date) {
    scrollToDate.value = date
  }

  /**
   * Clear the scroll request after it's been handled
   */
  function clearScrollRequest() {
    scrollToDate.value = null
  }

  return {
    // Reactive state
    dateInView: dateInView as Ref<Date | null>,
    scrollToDate: scrollToDate as Ref<Date | null>,

    // Actions
    setDateInView,
    requestScrollToDate,
    clearScrollRequest,
  }
}
