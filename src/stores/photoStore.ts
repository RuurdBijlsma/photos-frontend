import { type Ref, ref, shallowRef } from 'vue'
import { defineStore } from 'pinia'
import type { MediaItemDto } from '@/script/types/api/photos'
import photoService from '@/script/services/photoService.ts'
import { useSnackbarsStore } from '@/stores/snackbarStore.ts'
import type { MonthlyRatios } from '@/generated/ratios.ts'

interface TimelineInfo {
  ratios: MonthlyRatios[] | null
  months: string[]
}

export const usePhotoStore = defineStore('photos', () => {
  // --- STATE ---
  const isLoading = ref(false)
  const months = shallowRef(new Map<string, MediaItemDto[]>())
  const monthsLoading: Ref<Set<string>> = ref(new Set())
  const snackbarStore = useSnackbarsStore()
  const timeline: Ref<TimelineInfo> = ref({
    ratios: null,
    months: [],
  })

  async function fetchLayoutRatios() {
    const now = performance.now()
    const response = await photoService.getPhotoRatios()
    timeline.value.ratios = response.results
    timeline.value.months = response.results.map((m) => m.month)
    console.log('getPhotoRatios: ', performance.now() - now, 'ms')
    console.log({ timeline })
  }

  async function fetchMediaByMonths(monthIds: string[]) {
    if (!monthIds || monthIds.length === 0) {
      return
    }
    const now1 = performance.now()
    const unfetchedMonths = monthIds.filter(
      (m) => !months.value.has(m) && !monthsLoading.value.has(m),
    )
    if (unfetchedMonths.length === 0) {
      console.warn('All requested months have already been loaded.')
      return
    }

    try {
      unfetchedMonths.forEach((m) => monthsLoading.value.add(m))
      isLoading.value = true
      // Fetch data only for the new months.
      console.log('now1', performance.now() - now1)
      const now2 = performance.now()
      const response = await photoService.getMediaByMonths(unfetchedMonths)
      console.log('now2', performance.now() - now2, 'ms')
      const newMonthGroups = response.data.months

      if (!newMonthGroups || newMonthGroups.length === 0) {
        console.warn('Nothing returned by the api!')
        return
      }

      const now3 = performance.now()
      // todo: hoe kan dit nou 100 ms kosten?
      const updated = new Map(months.value)
      for (const nmg of newMonthGroups) {
        updated.set(nmg.month, nmg.mediaItems)
      }
      months.value = updated
      console.log('now3', performance.now() - now3, 'ms')
    } catch (err) {
      snackbarStore.error('Failed to fetch the months.', err as Error)
    } finally {
      unfetchedMonths.forEach((m) => monthsLoading.value.delete(m))
      isLoading.value = false
    }
  }

  return {
    // State
    months,
    timeline,
    monthsLoading,

    // Actions
    fetchMediaByMonths,
    fetchLayoutRatios,
  }
})
