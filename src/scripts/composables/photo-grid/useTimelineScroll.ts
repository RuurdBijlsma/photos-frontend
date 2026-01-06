import { ref, type Ref } from 'vue'

/**
 * Shared state for timeline scroll communication between TimelineView and TimelineScroll.
 * This composable provides a bridge for:
 * - TimelineView to report what date is currently in view
 * - TimelineScroll to request scrolling to a specific date
 */

const dateInView = ref<Date | null>(null)
const scrollToDate = ref<Date | null>(null)
const scrollTop = ref(0)

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

  function setScrollTop(value: number) {
    scrollTop.value = value
  }

  return {
    // Reactive state
    dateInView: dateInView as Ref<Date | null>,
    scrollToDate: scrollToDate as Ref<Date | null>,
    scrollTop: scrollTop as Ref<number>,

    // Actions
    setDateInView,
    requestScrollToDate,
    clearScrollRequest,
    setScrollTop,
  }
}
