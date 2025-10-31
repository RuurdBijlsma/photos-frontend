import { computed, type ComputedRef, ref, shallowRef, triggerRef } from 'vue'
import { defineStore } from 'pinia'
import photoService from '@/script/services/photoService'
import { useSnackbarsStore } from '@/stores/snackbarStore'
import { type MediaItem, type TimelineMonth } from '@/generated/photos'
import { useAuthStore } from '@/stores/authStore.ts'
import type { FullMediaItem } from '@/script/types/api/fullPhoto.ts'

export const usePhotoStore = defineStore('photos', () => {
  const isLoading = ref(false)
  const fetchingTimeline = ref(false)
  const mediaItems = shallowRef(new Map<string, MediaItem[]>())
  const mediaCache = shallowRef(new Map<string, FullMediaItem>())
  const mediaMonthsLoading = ref(new Set<string>())
  const timeline = ref<TimelineMonth[] | null>(null)
  const timelineMonths: ComputedRef<string[]> = computed(
    () => timeline.value?.map((m) => m.monthId) ?? [],
  )
  const fetchingMedia = ref(new Set<string>())
  const snackbarStore = useSnackbarsStore()
  const authStore = useAuthStore()

  async function fetchMedia(id: string | undefined) {
    if (id === undefined) return
    if (fetchingMedia.value.has(id) || mediaCache.value.has(id)) {
      return
    }
    fetchingMedia.value.add(id)
    const now = performance.now()
    try {
      const { data } = await photoService.fetchMediaItem(id)
      console.log('FULL MEDIA ITEM', data)
      mediaCache.value.set(id, data)
    } catch (e) {
      snackbarStore.error('Failed to fetch full media item.', e as Error)
    } finally {
      console.log(`fetchMedia[${id}]:`, performance.now() - now, 'ms')
      fetchingMedia.value.delete(id)
    }
  }

  async function fetchTimeline() {
    if (fetchingTimeline.value) return
    fetchingTimeline.value = true
    const t0 = performance.now()
    try {
      const timelineResponse = await photoService.getTimeline()
      timeline.value = timelineResponse.months
    } catch (e) {
      snackbarStore.error('Failed to fetch grid layout.', e as Error)
    } finally {
      console.log('fetchTimeline:', performance.now() - t0, 'ms')
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
      console.log(`fetchMediaByMonths [${targets}]:`, performance.now() - t0, 'ms')
    } catch (e) {
      snackbarStore.error('Failed to fetch media.', e as Error)
    } finally {
      targets.forEach((m) => mediaMonthsLoading.value.delete(m))
      isLoading.value = false
    }
  }

  async function initialize() {
    if (!authStore.isAuthenticated) return
    await fetchTimeline()

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
  }

  return {
    // State
    mediaItems,
    mediaMonthsLoading,
    timeline,
    timelineMonths,
    mediaCache,

    // Actions
    fetchTimeline,
    fetchMediaByMonths,
    initialize,
    fetchMedia,
  }
})

export type PhotoStore = ReturnType<typeof usePhotoStore>
