import { defineStore } from 'pinia'
import { shallowRef, triggerRef } from 'vue'
import type { FullMediaItem } from '@/scripts/types/api/fullPhoto.ts'
import mediaItemService from '@/scripts/services/mediaItemService.ts'
import type { AxiosResponse } from 'axios'

export const useMediaItemStore = defineStore('mediaItem', () => {
  const mediaItems = shallowRef(new Map<string, FullMediaItem>())
  const mediaItemPromises = new Map<string, Promise<AxiosResponse<FullMediaItem>>>()

  async function fetchMediaItem(id: string) {
    if (mediaItemPromises.has(id)) {
      await mediaItemPromises.get(id)
      return
    }
    if (mediaItems.value.has(id)) return

    const promise = mediaItemService.getMediaItem(id)
    mediaItemPromises.set(id, promise)
    const result = await promise
    mediaItemPromises.delete(id)

    mediaItems.value.set(id, result.data)
    triggerRef(mediaItems)
  }

  return {
    mediaItems,

    fetchMediaItem,
  }
})
