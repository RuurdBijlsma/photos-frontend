import { defineStore } from 'pinia'
import { shallowRef, triggerRef, watch } from 'vue'
import type { Album, UpdateAlbumRequest } from '@/scripts/types/api/album.ts'
import albumService from '@/scripts/services/albumService.ts'
import type { FullAlbumMediaResponse } from '@/scripts/types/generated/timeline.ts'
import { useSnackbarsStore } from '@/scripts/stores/snackbarStore.ts'

export const useAlbumStore = defineStore('album', () => {
  const snackbarStore = useSnackbarsStore()

  const userAlbums = shallowRef<Album[]>(
    localStorage.getItem('userAlbums') === null ? [] : JSON.parse(localStorage.userAlbums),
  )
  const albumMedia = shallowRef(new Map<string, FullAlbumMediaResponse>())
  const albumMediaPromises = new Map<string, Promise<FullAlbumMediaResponse>>()

  watch(userAlbums, () => {
    localStorage.setItem('userAlbums', JSON.stringify(userAlbums.value))
  })

  async function fetchUserAlbums() {
    const { data } = await albumService.getUserAlbums()
    userAlbums.value = data
  }

  async function fetchAlbumMedia(albumId: string, useCache = true) {
    if (albumMediaPromises.has(albumId)) {
      await albumMediaPromises.get(albumId)!
      return
    }
    if (useCache && albumMedia.value.has(albumId)) return

    const promise = albumService.getAlbumMedia(albumId)
    albumMediaPromises.set(albumId, promise)
    const response = await promise
    albumMediaPromises.delete(albumId)

    albumMedia.value.set(albumId, response)
    triggerRef(albumMedia)
  }

  async function updateAlbumDetails(albumId: string, albumDetails: UpdateAlbumRequest) {
    try {
      await albumService.updateAlbum(albumId, albumDetails)
      requestIdleCallback(() => fetchUserAlbums())
    } catch (e) {
      snackbarStore.error(`Failed to update album: ${albumId}.`, e as Error)
    }
  }

  return {
    userAlbums,
    albumMedia,

    fetchUserAlbums,
    fetchAlbumMedia,
    updateAlbumDetails,
  }
})
