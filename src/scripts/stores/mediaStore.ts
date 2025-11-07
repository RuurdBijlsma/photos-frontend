import { ref, shallowRef } from 'vue'
import { defineStore } from 'pinia'
import photoService from '@/scripts/services/photoService.ts'
import { useSnackbarsStore } from '@/scripts/stores/snackbarStore.ts'
import type { FullMediaItem } from '@/scripts/types/api/fullPhoto.ts'

export const useMediaStore = defineStore('media', () => {
  const cache = shallowRef(new Map<string, FullMediaItem>())
  const pendingFetches = ref(new Map<string, Promise<void>>())
  const snackbarStore = useSnackbarsStore()

  async function fetchItem(id: string | null | undefined) {
    if (id === null || id === undefined) return

    if (cache.value.has(id)) {
      return
    }

    const existingFetch = pendingFetches.value.get(id)
    if (existingFetch) {
      return existingFetch
    }

    const now = performance.now()

    const fetchPromise = (async () => {
      try {
        const { data } = await photoService.getMediaItem(id)
        const newCache = new Map(cache.value)
        newCache.set(id, data)
        cache.value = newCache
      } catch (e) {
        snackbarStore.error('Failed to fetch full media item.', e as Error)
        throw e
      }
    })()
    const promiseWithCleanup = fetchPromise.finally(() => {
      console.log(`fetchMedia[${id}]:`, performance.now() - now, 'ms')
      pendingFetches.value.delete(id)
    })
    pendingFetches.value.set(id, promiseWithCleanup)
    return await promiseWithCleanup
  }

  return {
    // State
    cache,

    // Actions
    fetchItem,
  }
})
