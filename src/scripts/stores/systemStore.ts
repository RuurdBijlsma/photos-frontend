import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import type { SystemStats } from '@/scripts/types/api/system.ts'
import systemService from '@/scripts/services/systemService.ts'
import { useSnackbarsStore } from '@/scripts/stores/snackbarStore.ts'
import { useObjStorage } from '@/scripts/utils.ts'

const DEFAULT_SYSTEM_STATS = {
  hasClusteredPeople: true,
  hasClusteredPhotos: true,
}

export const useSystemStore = defineStore('system', () => {
  const snackbarStore = useSnackbarsStore()

  const stats = useObjStorage<SystemStats>('systemStats', DEFAULT_SYSTEM_STATS)

  async function fetchStats() {
    try {
      const { data } = await systemService.getStats()
      console.log('system stats', data)
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
