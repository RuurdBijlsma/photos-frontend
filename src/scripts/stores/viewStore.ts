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
      if (timelineStore.ids.length === 0) {
        await timelineStore.fetchIds()
      }
      orderedIds.value = timelineStore.ids
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
