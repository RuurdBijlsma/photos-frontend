import { defineStore } from 'pinia'
import { shallowRef, triggerRef } from 'vue'
import type { FullMediaItem } from '@/scripts/types/api/fullPhoto.ts'
import mediaItemService from '@/scripts/services/mediaItemService.ts'
import type { AxiosResponse } from 'axios'
import { useSnackbarsStore } from '@/scripts/stores/snackbarStore.ts'
import type { UpdateMediaItemRequest } from '@/scripts/types/api/mediaItem.ts'

export const useMediaItemStore = defineStore('mediaItem', () => {
  const snackbarStore = useSnackbarsStore()

  const mediaItems = shallowRef(new Map<string, FullMediaItem>())
  const mediaItemPromises = new Map<string, Promise<AxiosResponse<FullMediaItem>>>()

  async function updateMediaItem(mediaItemId: string, itemDetails: UpdateMediaItemRequest) {
    try {
      await mediaItemService.update(mediaItemId, itemDetails)
      requestIdleCallback(() => fetchMediaItem(mediaItemId, false))
    } catch (e) {
      snackbarStore.error(`Failed to update album.`, e as Error)
    }
  }

  async function fetchMediaItem(id: string, useCache: boolean = true) {
    if (mediaItemPromises.has(id)) {
      await mediaItemPromises.get(id)
      return
    }
    if (useCache && mediaItems.value.has(id)) return

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
    updateMediaItem,
  }
})
