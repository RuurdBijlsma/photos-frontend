import { ref, shallowRef } from 'vue'
import { defineStore } from 'pinia'
import photoService from '@/script/services/photoService'
import { useSnackbarsStore } from '@/stores/snackbarStore'
import type { FullMediaItem } from '@/script/types/api/fullPhoto.ts'

export const useMediaStore = defineStore('media', () => {
  const cache = shallowRef(new Map<string, FullMediaItem>())
  const fetchingMedia = ref(new Set<string>())
  const snackbarStore = useSnackbarsStore()

  async function fetchItem(id: string | null | undefined) {
    if (id === null || id === undefined) return
    if (fetchingMedia.value.has(id) || cache.value.has(id)) {
      return
    }
    fetchingMedia.value.add(id)
    const now = performance.now()
    try {
      const { data } = await photoService.getMediaItem(id)
      console.log('FULL MEDIA ITEM', data)
      cache.value.set(id, data)
    } catch (e) {
      snackbarStore.error('Failed to fetch full media item.', e as Error)
    } finally {
      console.log(`fetchMedia[${id}]:`, performance.now() - now, 'ms')
      fetchingMedia.value.delete(id)
    }
  }
  return {
    // State
    cache,

    // Actions
    fetchItem,
  }
})
