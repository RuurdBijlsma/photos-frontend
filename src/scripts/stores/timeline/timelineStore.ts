import { defineStore } from 'pinia'
import { shallowRef } from 'vue'
import { TimelineMonthRatios } from '@/scripts/types/generated/timeline.ts'
import photoService from '@/scripts/services/photoService.ts'

export const useTimelineStore = defineStore('timeline', () => {
  const monthRatios = shallowRef<TimelineMonthRatios[]>([])

  async function fetchMonthRatios() {
    const response = await photoService.getTimelineRatios()
    monthRatios.value = response.months
  }

  async function initialize() {
    await fetchMonthRatios()
    // load months here
  }

  return {
    monthRatios,
    fetchMonthRatios,
    initialize,
  }
})
