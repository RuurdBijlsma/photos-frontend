import { defineStore } from 'pinia'
import { shallowRef, triggerRef, watch } from 'vue'
import type { Album, UpdateAlbumRequest } from '@/scripts/types/api/album.ts'
import albumService from '@/scripts/services/albumService.ts'
import type { FullAlbumMediaResponse } from '@/scripts/types/generated/timeline.ts'
import { useSnackbarsStore } from '@/scripts/stores/snackbarStore.ts'
import { useSelectionStore } from '@/scripts/stores/timeline/selectionStore.ts'
import { useDialogStore } from '@/scripts/stores/dialogStore.ts'

export const useAlbumStore = defineStore('album', () => {
  const snackbarStore = useSnackbarsStore()
  const selectionStore = useSelectionStore()
  const dialogs = useDialogStore()

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

  async function deleteAlbum(albumId: string) {
    try {
      await albumService.deleteAlbum(albumId)
      requestIdleCallback(() => fetchUserAlbums())
      snackbarStore.info("Album deleted")
    } catch (e) {
      snackbarStore.error(`Failed to delete album.`, e as Error)
    }
  }

  async function updateAlbumDetails(albumId: string, albumDetails: UpdateAlbumRequest) {
    try {
      await albumService.updateAlbum(albumId, albumDetails)
      requestIdleCallback(() => fetchUserAlbums())
    } catch (e) {
      snackbarStore.error(`Failed to update album.`, e as Error)
    }
  }

  async function removeFromAlbum(albumId: string, removeItemIds: string[]) {
    const confirmed = await dialogs.confirm({
      title: 'Are you sure?',
      description: `This will remove ${removeItemIds.length} item${removeItemIds.length === 1 ? '' : 's'} from the album.`,
      confirmText: 'Remove',
      color: 'error',
    })
    if (!confirmed) return
    try {
      await albumService.removeMediaFromAlbum(albumId, removeItemIds)
      selectionStore.deselectMany(removeItemIds)
      requestIdleCallback(() => {
        fetchAlbumMedia(albumId, false)
        fetchUserAlbums()
      })
    } catch (e) {
      snackbarStore.error('Error removing items from album', e)
    }
  }

  return {
    userAlbums,
    albumMedia,

    fetchUserAlbums,
    fetchAlbumMedia,
    updateAlbumDetails,
    removeFromAlbum,
    deleteAlbum,
  }
})
