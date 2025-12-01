import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useTimelineStore } from '@/scripts/stores/timelineStore.ts'
import { useRoute } from 'vue-router'

export type ViewContext = 'timeline' | 'album' | 'search'

export const useViewStore = defineStore('view', () => {
  const timelineStore = useTimelineStore()
  const route = useRoute()

  // --- STATE ---
  const orderedIds = ref<string[]>([])
  const sourceContext = ref<ViewContext | null>(null)

  async function setFromRoute() {
    const isTimeline = route.matched.find((r) => r.name === 'timeline')
    if (isTimeline) {
      if (timelineStore.controller.ids.length === 0) {
        await timelineStore.controller.fetchIds()
      }
      orderedIds.value = timelineStore.controller.ids
    }
  }

  return {
    // State
    orderedIds,
    sourceContext,
    // Getters
    // Actions
    setFromRoute,
  }
})
