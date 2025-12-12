import { computed, type ComputedRef, reactive, ref, shallowRef, triggerRef } from 'vue'
import { useSnackbarsStore } from '@/scripts/stores/snackbarStore.ts'
import type {
  TimelineItem,
  TimelineItemsResponse,
  TimelineMonthRatios,
  TimelineRatiosResponse,
} from '@/scripts/types/generated/timeline.ts'

export interface TimelineDataProvider {
  getIds(): Promise<string[]>
  getRatios(): Promise<TimelineRatiosResponse>
  getMediaByMonths(monthIds: string[]): Promise<TimelineItemsResponse>
}

export function createTimelineController(provider: TimelineDataProvider) {
  // --- State ---
  const fetchingTimeline = ref(false)
  const fetchingIds = ref(false)
  const mediaItems = shallowRef(new Map<string, TimelineItem[]>())
  const mediaMonthsLoading = ref(new Set<string>())
  const timeline = shallowRef<TimelineMonthRatios[] | null>(null)
  const ids = ref<string[]>([])

  // --- External Dependencies ---
  // Note: This must be called inside a Setup context (component or another store)
  const snackbarStore = useSnackbarsStore()

  // --- Computed ---
  const timelineMonths: ComputedRef<string[]> = computed(
    () => timeline.value?.map((m) => m.monthId) ?? [],
  )

  const monthToIndex = computed(() => {
    const map = new Map<string, number>()
    timeline.value?.forEach((m, i) => map.set(m.monthId, i))
    return map
  })

  // --- Actions ---
  async function fetchIds() {
    if (fetchingIds.value) return
    fetchingIds.value = true
    const t0 = performance.now()
    try {
      ids.value = await provider.getIds()
    } catch (e) {
      snackbarStore.error('Failed to fetch ids.', e)
    } finally {
      console.log('fetchIds:', performance.now() - t0, 'ms')
      fetchingIds.value = false
    }
  }

  async function fetchRatios() {
    if (fetchingTimeline.value) return
    fetchingTimeline.value = true
    const t0 = performance.now()
    try {
      const timelineResponse = await provider.getRatios()
      timeline.value = timelineResponse.months
    } catch (e) {
      snackbarStore.error('Failed to fetch grid layout.', e)
    } finally {
      console.log('fetchRatios:', performance.now() - t0, 'ms')
      fetchingTimeline.value = false
    }
  }

  async function fetchMediaByMonths(monthIds: string[]) {
    const targets = monthIds.filter(
      (m) => !mediaItems.value.has(m) && !mediaMonthsLoading.value.has(m),
    )
    if (!targets.length) return
    targets.forEach((m) => mediaMonthsLoading.value.add(m))

    try {
      const t0 = performance.now()
      const { months } = await provider.getMediaByMonths(targets)
      for (const monthMedia of months ?? []) {
        mediaItems.value.set(monthMedia.monthId, monthMedia.items)
      }
      triggerRef(mediaItems)
      console.log(`fetchMediaByMonths [${targets.length} months]:`, performance.now() - t0, 'ms')
    } catch (e) {
      snackbarStore.error('Failed to fetch media.', e as Error)
    } finally {
      targets.forEach((m) => mediaMonthsLoading.value.delete(m))
    }
  }

  async function preFetch(nPhotos: number = 200) {
    await fetchRatios()

    if (timeline.value === null) return
    const toRequest = []
    for (const timelineMonth of timeline.value) {
      toRequest.push(timelineMonth.monthId)
      nPhotos -= timelineMonth.count
      if (nPhotos < 0) break
    }
    await fetchMediaByMonths(toRequest)
    requestIdleCallback(() => fetchIds())
  }

  // Return the "Instance"
  return reactive({
    // State
    mediaItems,
    mediaMonthsLoading,
    timeline,
    timelineMonths,
    monthToIndex,
    ids,

    // Actions
    fetchRatios,
    fetchIds,
    fetchMediaByMonths,
    preFetch,
  })
}

// Extract the type so you can use it in function signatures
export type GenericTimeline = ReturnType<typeof createTimelineController>
