import { defineStore } from 'pinia'
import { useAuthStore } from '@/scripts/stores/authStore.ts'
import { createTimelineController } from '@/scripts/services/timeline/GenericTimeline.ts'
import { MainTimelineProvider } from '@/scripts/services/timeline/MainTimelineProvider.ts'

export const useTimelineStore = defineStore('timeline', () => {
  const controller = createTimelineController(new MainTimelineProvider())
  const authStore = useAuthStore()

  async function initialize() {
    if (!authStore.isAuthenticated) return
    await controller.preFetch()
  }

  return {
    controller,
    initialize,
  }
})

export type TimelineStore = ReturnType<typeof useTimelineStore>
