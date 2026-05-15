import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import type { SystemStats } from '@/scripts/types/api/system.ts'
import systemService from '@/scripts/services/systemService.ts'
import { useSnackbarsStore } from '@/scripts/stores/snackbarStore.ts'

const DEFAULT_SYSTEM_STATS = {
  has_clustered_people: true,
  has_clustered_photos: true,
}

export const useSystemStore = defineStore('system', () => {
  const snackbarStore = useSnackbarsStore()

  const stats = ref<SystemStats>(
    localStorage.getItem('systemStats') === null
      ? DEFAULT_SYSTEM_STATS
      : JSON.parse(localStorage.getItem('systemStats')!),
  )
  watch(stats, (newVal) => localStorage.setItem('systemStats', JSON.stringify(newVal)))

  async function fetchStats() {
    try {
      const { data } = await systemService.getStats()
      stats.value = data
    } catch (e) {
      snackbarStore.error('Could not fetch system stats', e)
    }
  }

  return {
    stats,
    fetchStats,
  }
})
