import { ref, shallowRef, triggerRef } from 'vue'
import { defineStore } from 'pinia'
import type { MediaItemDto } from '@/script/types/api/photos'
import photoService from '@/script/services/photoService'
import { useSnackbarsStore } from '@/stores/snackbarStore'
import type { MonthlyRatios } from '@/generated/ratios'

export const usePhotoStore = defineStore('photos', () => {
  const isLoading = ref(false)
  const months = shallowRef(new Map<string, MediaItemDto[]>())
  const monthsLoading = ref(new Set<string>())
  const snackbarStore = useSnackbarsStore()
  const timeline = ref<{ ratios: MonthlyRatios[] | null; months: string[] }>({
    ratios: null,
    months: [],
  })

  async function fetchLayoutRatios() {
    const t0 = performance.now()
    try {
      const res = await photoService.getPhotoRatios()
      timeline.value.ratios = res.results
      timeline.value.months = res.results.map((m) => m.month)
    } catch (e) {
      snackbarStore.error('Failed to fetch grid layout.', e as Error)
    } finally {
      console.log('getPhotoRatios:', performance.now() - t0, 'ms')
    }
  }

  async function fetchMediaByMonths(monthIds: string[]) {
    const targets = monthIds.filter((m) => !months.value.has(m) && !monthsLoading.value.has(m))
    if (!targets.length) return

    targets.forEach((m) => monthsLoading.value.add(m))
    isLoading.value = true

    try {
      const t0 = performance.now()
      const { data } = await photoService.getMediaByMonths(targets)
      for (const nmg of data.months??[]) {
        months.value.set(nmg.month, nmg.mediaItems)
      }
      triggerRef(months)
      console.log('fetchMediaByMonths:', performance.now() - t0, 'ms')
    } catch (e) {
      snackbarStore.error('Failed to fetch media.', e as Error)
    } finally {
      targets.forEach((m) => monthsLoading.value.delete(m))
      isLoading.value = false
    }
  }

  return {
    months,
    timeline,
    monthsLoading,
    fetchLayoutRatios,
    fetchMediaByMonths,
  }
})
