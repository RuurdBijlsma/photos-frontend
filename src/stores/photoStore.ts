import { computed, ref, shallowRef, triggerRef } from 'vue'
import { defineStore } from 'pinia'
import photoService from '@/script/services/photoService'
import { useSnackbarsStore } from '@/stores/snackbarStore'
import { type MediaItem, MonthTimeline } from '@/generated/ratios'

export const usePhotoStore = defineStore('photos', () => {
  const isLoading = ref(false)
  const mediaItems = shallowRef(new Map<string, MediaItem[]>())
  const mediaMonthsLoading = ref(new Set<string>())
  const timeline = ref<MonthTimeline[] | null>(null)
  const timelineMonths = computed(() => timeline.value?.map((m) => m.monthId) ?? [])
  const snackbarStore = useSnackbarsStore()

  async function fetchTimeline() {
    const t0 = performance.now()
    try {
      const timelineResponse = await photoService.getTimeline()
      timeline.value = timelineResponse.months
    } catch (e) {
      snackbarStore.error('Failed to fetch grid layout.', e as Error)
    } finally {
      console.log('fetchTimeline:', performance.now() - t0, 'ms')
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
      console.log('fetchMediaByMonths:', performance.now() - t0, 'ms')
    } catch (e) {
      snackbarStore.error('Failed to fetch media.', e as Error)
    } finally {
      targets.forEach((m) => mediaMonthsLoading.value.delete(m))
      isLoading.value = false
    }
  }

  return {
    // State
    mediaItems,
    mediaMonthsLoading,
    timeline,
    timelineMonths,

    // Actions
    fetchTimeline,
    fetchMediaByMonths,
  }
})
