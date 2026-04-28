import { defineStore } from 'pinia'
import { computed, ref, shallowRef, triggerRef } from 'vue'
import {
  type TimelineItem,
  TimelineMonthRatios,
  type TimelineRatiosResponse,
} from '@/scripts/types/generated/timeline.ts'
import timelineService from '@/scripts/services/timelineService.ts'
import { useSnackbarsStore } from '@/scripts/stores/snackbarStore.ts'

export const useTimelineStore = defineStore('timeline', () => {
  const snackbarStore = useSnackbarsStore()

  let thumbAlertFired = false
  const mediaIdInView = ref<string | null>(null)
  const isInitialized = ref(false)
  const monthRatios = shallowRef<TimelineMonthRatios[]>([])
  const monthItems = shallowRef(new Map<string, TimelineItem[]>())
  const mediaItems = computed(() => {
    const result: TimelineItem[] = []
    const monthIds = [...monthItems.value.keys()].sort((a, b) => (a < b ? 1 : -1))
    for (const monthId of monthIds) {
      const group = monthItems.value.get(monthId)!
      const len = group.length
      for (let i = 0; i < len; i++) result.push(group[i]!)
    }
    return result
  })
  const mediaItemIds = computed(() => mediaItems.value.map((m) => m.id))
  const totalMediaCount = computed(() => monthRatios.value.reduce((a, b) => a + b.count, 0))

  const monthItemsLoading = new Set<string>()
  let ratiosPromise: Promise<TimelineRatiosResponse> | null = null

  async function fetchMonthRatios() {
    try {
      if (!ratiosPromise) ratiosPromise = timelineService.getTimelineRatios()
      const response = await ratiosPromise
      monthRatios.value = response.months
    } catch (e) {
      snackbarStore.error('Failed to fetch timeline layout.', e)
    } finally {
      ratiosPromise = null
    }
  }

  async function fetchMediaByMonth(monthIds: string[]) {
    monthIds = monthIds.filter((m) => !monthItems.value.has(m) && !monthItemsLoading.has(m))
    if (monthIds.length === 0) return
    monthIds.forEach((m) => monthItemsLoading.add(m))

    try {
      const response = await timelineService.getMediaByMonths(monthIds)
      for (const { monthId, items } of response.months) {
        monthItems.value.set(monthId, items)
      }
      triggerRef(monthItems)
      requestIdleCallback(() => {
        if (thumbAlertFired) return
        outer: for (const x of response.months) {
          for (const item of x.items) {
            if (item.hasThumbnails && !thumbAlertFired) {
              thumbAlertFired = true
              snackbarStore.enqueue({
                message:
                  "Your photos are still processing, the library will be less responsive until it's done.",
                color: 'warning',
                timeout: -1,
                icon: 'mdi-alert',
              })
              setTimeout(() => {
                snackbarStore.enqueue({
                  message: "Here's another snackbar.",
                  color: 'info',
                  timeout: -1,
                  icon: 'mdi-information-outline',
                })
              }, 500)
              setTimeout(() => {
                snackbarStore.enqueue({
                  message:
                    "Another one! Here's another snackbar.",
                  color: 'info',
                  timeout: -1,
                  icon: 'mdi-alert',
                })
              }, 1000)
              break outer
            }
          }
        }
        console.log('All AVIF thumbnails are available')
      })
    } catch (e) {
      snackbarStore.error('Failed to fetch media.', e)
    } finally {
      monthIds.forEach((m) => monthItemsLoading.delete(m))
    }
  }

  async function initialize() {
    isInitialized.value = true
    await fetchMonthRatios()

    const MONTHS_PREFETCH_COUNT = 2
    const monthsToFetch = monthRatios.value
      .slice(0, MONTHS_PREFETCH_COUNT)
      .map((m) => m?.monthId)
      .filter(Boolean)

    if (monthsToFetch.length > 0) await fetchMediaByMonth(monthsToFetch)
  }

  return {
    monthRatios,
    monthItems,
    mediaItems,
    mediaItemIds,
    totalMediaCount,
    isInitialized,
    mediaIdInView,

    fetchMonthRatios,
    fetchMediaByMonth,
    initialize,
  }
})
