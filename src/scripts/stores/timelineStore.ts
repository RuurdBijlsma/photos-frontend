import { computed, type ComputedRef, ref, shallowRef, triggerRef } from 'vue'
import { defineStore } from 'pinia'
import photoService from '@/scripts/services/photoService.ts'
import { useSnackbarsStore } from '@/scripts/stores/snackbarStore.ts'
import { useAuthStore } from '@/scripts/stores/authStore.ts'
import type { MediaItem, TimelineMonth } from '@/scripts/types/generated/photos.ts'

export const useTimelineStore = defineStore('timeline', () => {
  const isLoading = ref(false)
  const fetchingTimeline = ref(false)
  const fetchingIds = ref(false)
  const mediaItems = shallowRef(new Map<string, MediaItem[]>())
  const mediaMonthsLoading = ref(new Set<string>())
  const timeline = shallowRef<TimelineMonth[] | null>(null)
  const ids = ref<string[]>([])
  const timelineMonths: ComputedRef<string[]> = computed(
    () => timeline.value?.map((m: { monthId: string }) => m.monthId) ?? [],
  )
  const monthToIndex = computed(() => {
    const map = new Map<string, number>()
    timeline.value?.forEach((m, i) => map.set(m.monthId, i))
    return map
  })
  const snackbarStore = useSnackbarsStore()
  const authStore = useAuthStore()

  async function fetchIds() {
    if (fetchingIds.value) return
    fetchingIds.value = true
    const t0 = performance.now()
    try {
      const { data } = await photoService.getTimelineIds()
      ids.value = data
    } catch (e) {
      snackbarStore.error('Failed to fetch all ids.', e)
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
      const timelineResponse = await photoService.getTimelineRatios()
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
    isLoading.value = true

    try {
      const t0 = performance.now()
      const { months } = await photoService.getMediaByMonths(targets)
      for (const monthMedia of months ?? []) {
        mediaItems.value.set(monthMedia.monthId, monthMedia.items)
      }
      triggerRef(mediaItems)
      console.log(`fetchMediaByMonths [${targets.length} months]:`, performance.now() - t0, 'ms')
    } catch (e) {
      snackbarStore.error('Failed to fetch media.', e as Error)
    } finally {
      targets.forEach((m) => mediaMonthsLoading.value.delete(m))
      isLoading.value = false
    }
  }

  async function initialize() {
    if (!authStore.isAuthenticated) return
    await fetchRatios()

    if (timeline.value === null) return
    let nPhotos = 100
    const toRequest = []
    for (const timelineMonth of timeline.value) {
      toRequest.push(timelineMonth.monthId)
      nPhotos -= timelineMonth.count
      if (nPhotos < 0) break
    }
    console.log('toRequest:', toRequest)
    await fetchMediaByMonths(toRequest)
    // requestIdleCallback(fetchIds) // todo: bring back
  }

  return {
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
    initialize,
  }
})

export type TimelineStore = ReturnType<typeof useTimelineStore>
