import { defineStore } from 'pinia'
import { computed, shallowRef, triggerRef } from 'vue'
import {
  type TimelineItem,
  TimelineMonthRatios,
  type TimelineRatiosResponse,
} from '@/scripts/types/generated/timeline.ts'
import photoService from '@/scripts/services/photoService.ts'
import { useSnackbarsStore } from '@/scripts/stores/snackbarStore.ts'

export const useTimelineStore = defineStore('timeline', () => {
  const snackbarStore = useSnackbarsStore()

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

  const monthItemsLoading = new Set<string>()
  let ratiosPromise: Promise<TimelineRatiosResponse> | null = null

  async function fetchMonthRatios() {
    try {
      if (!ratiosPromise) ratiosPromise = photoService.getTimelineRatios()
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
      const response = await photoService.getMediaByMonths(monthIds)
      for (const { monthId, items } of response.months) {
        monthItems.value.set(monthId, items)
      }
      triggerRef(monthItems)
    } catch (e) {
      snackbarStore.error('Failed to fetch media.', e)
    } finally {
      monthIds.forEach((m) => monthItemsLoading.delete(m))
    }
  }

  async function initialize() {
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

    fetchMonthRatios,
    fetchMediaByMonth,
    initialize,
  }
})
