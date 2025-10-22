import { type Ref, ref } from 'vue'
import { defineStore } from 'pinia'
import type { MediaItemDto, TimelineMonthInfo } from '@/script/types/api/photos'
import photosService from '@/script/services/photosService.ts'
import { useSnackbarsStore } from '@/stores/snackbarStore.ts'

export const usePhotosStore = defineStore('photos', () => {
  // --- STATE ---
  const timelineSummary = ref<TimelineMonthInfo[]>([])
  const isLoading = ref(false)
  const monthData: Ref<{ [key: string]: MediaItemDto[] }> = ref({})
  const snackbarStore = useSnackbarsStore()

  /**
   * Fetches media items for a given set of months.
   * @param months - An array of "YYYY-MM" formatted strings.
   */
  async function fetchMediaByMonth(months: { month: number; year: number }[]) {
    if (months.length === 0) return

    isLoading.value = true
    try {
      const monthStrings = months.map((m) => `${m.year}-${m.month}`)
      console.log(monthStrings)
      const response = await photosService.getMediaByMonth(monthStrings)
      console.log('response.data', response.data)
      for (const month of response.data.months) {
        monthData.value[month.month] = month.mediaItems
      }
    } catch (err) {
      snackbarStore.error('Failed to fetch the timeline summary.', err as Error)
    } finally {
      isLoading.value = false
    }
  }

  // --- ACTIONS ---
  function findClosestTimelineIndex(target: Date): number | null {
    if (timelineSummary.value.length === 0) return null

    const targetYear = target.getFullYear()
    const targetMonth = target.getMonth() + 1

    let bestIndex = null
    let minDiff = Infinity

    for (let i = 0; i < timelineSummary.value.length; i++) {
      const entry = timelineSummary.value[i]!
      const diff = Math.abs((entry.year - targetYear) * 12 + (entry.month - targetMonth))

      if (diff < minDiff) {
        minDiff = diff
        bestIndex = i
      }
    }

    return bestIndex
  }

  /**
   * Fetches the timeline summary data (media counts by year and month).
   */
  async function fetchTimelineSummary() {
    isLoading.value = true
    try {
      const response = await photosService.getTimelineSummary()
      timelineSummary.value = response.data
    } catch (err) {
      snackbarStore.error('Failed to fetch the timeline summary.', err as Error)
    } finally {
      isLoading.value = false
    }
  }

  function fetchMediaAroundDate(date: Date, targetCount: number) {
    isLoading.value = true
    if (timelineSummary.value.length === 0) {
      console.warn('Timeline summary not retrieved before fetching months.')
      return null
    }

    try {
      const bestIndex = findClosestTimelineIndex(date)
      if (bestIndex === null) {
        console.warn("Can't find best index around date", date)
        return null
      }

      const monthsToFetch = new Set<TimelineMonthInfo>()
      let countBefore = 0 // for newer photos (lower index)
      let countAfter = 0 // for older photos (higher index)

      // Add the central month where the date falls.
      const centralMonth = timelineSummary.value[bestIndex]
      if (!centralMonth) {
        console.warn('No central month found.')
        return null
      }
      monthsToFetch.add(centralMonth)

      // Pointers to iterate outwards from the central index.
      let beforePtr = bestIndex - 1
      let afterPtr = bestIndex + 1

      // Loop until we have enough media count on both sides or run out of timeline.
      while (true) {
        const isBeforeExhausted = beforePtr < 0
        const isAfterExhausted = afterPtr >= timelineSummary.value.length
        const isBeforeComplete = countBefore >= targetCount
        const isAfterComplete = countAfter >= targetCount
        if ((isBeforeExhausted || isBeforeComplete) && (isAfterExhausted || isAfterComplete)) break

        // Gather newer months (chronologically BEFORE the date, so lower array index)
        if (countBefore < targetCount && !isBeforeExhausted) {
          const monthInfo = timelineSummary.value[beforePtr]
          beforePtr--
          if (monthInfo === undefined) continue
          countBefore += monthInfo.mediaCount
          monthsToFetch.add(monthInfo)
        }

        // Gather older months (chronologically AFTER the date, so higher array index)
        if (countAfter < targetCount && !isAfterExhausted) {
          const monthInfo = timelineSummary.value[afterPtr]
          afterPtr++
          if (monthInfo === undefined) continue
          countAfter += monthInfo.mediaCount
          monthsToFetch.add(monthInfo)
        }
      }
      return monthsToFetch
    } catch (err) {
      console.warn('Failed to fetch media around date', err)
    } finally {
      isLoading.value = false
    }
  }

  return {
    // State
    timelineSummary,
    monthData,
    isLoading,

    // Actions
    fetchTimelineSummary,
    fetchMediaByMonth,
    findClosestTimelineIndex,
    fetchMediaAroundDate,
  }
})
