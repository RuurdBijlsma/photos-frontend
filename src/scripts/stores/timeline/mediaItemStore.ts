import { defineStore } from 'pinia'
import { shallowRef, triggerRef } from 'vue'
import type { FullMediaItem } from '@/scripts/types/api/fullPhoto.ts'
import mediaItemService from '@/scripts/services/mediaItemService.ts'
import type { AxiosResponse } from 'axios'
import { useSnackbarsStore } from '@/scripts/stores/snackbarStore.ts'
import type { UpdateMediaItemRequest } from '@/scripts/types/api/mediaItem.ts'
import albumService from '@/scripts/services/albumService.ts'
import type { SharedMediaItem } from '@/scripts/types/api/album.ts'

export const useMediaItemStore = defineStore('mediaItem', () => {
  const snackbarStore = useSnackbarsStore()

  const mediaItems = shallowRef(new Map<string, FullMediaItem>())
  const mediaItemPromises = new Map<string, Promise<AxiosResponse<FullMediaItem>>>()
  const sharedMediaItems = shallowRef(new Map<string, SharedMediaItem>())
  const sharedMediaItemPromises = new Map<string, Promise<AxiosResponse<SharedMediaItem>>>()

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

  async function fetchSharedMediaItem(
    albumId: string,
    mediaItemId: string,
    useCache: boolean = true,
  ) {
    if (sharedMediaItemPromises.has(mediaItemId)) {
      await sharedMediaItemPromises.get(mediaItemId)
      return
    }
    if (useCache && sharedMediaItems.value.has(mediaItemId)) return

    const promise = albumService.getSharedMediaItem(albumId, mediaItemId)
    sharedMediaItemPromises.set(mediaItemId, promise)
    const result = await promise
    sharedMediaItemPromises.delete(mediaItemId)

    sharedMediaItems.value.set(mediaItemId, result.data)
    triggerRef(sharedMediaItems)
  }

  return {
    mediaItems,
    sharedMediaItems,

    fetchSharedMediaItem,
    fetchMediaItem,
    updateMediaItem,
  }
})
