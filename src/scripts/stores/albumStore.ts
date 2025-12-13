import { ref, shallowRef, triggerRef } from 'vue'
import { defineStore } from 'pinia'
import type {
  AlbumDetailsResponse,
  AlbumWithCount,
  UpdateAlbumRequest,
} from '@/scripts/types/api/album.ts'
import albumService from '@/scripts/services/albumService.ts'
import { useSnackbarsStore } from '@/scripts/stores/snackbarStore.ts'
import {
  createTimelineController,
  type GenericTimeline,
} from '@/scripts/services/timeline/GenericTimeline.ts'
import { AlbumTimelineProvider } from '@/scripts/services/timeline/AlbumTimelineProvider.ts'

export const useAlbumStore = defineStore('album', () => {
  const userAlbums = ref<AlbumWithCount[]>([])
  const fetchingUserAlbums = ref(false)
  const controllerCache = shallowRef(new Map<string, GenericTimeline>())

  const snackbarStore = useSnackbarsStore()

  async function createController(albumId: string) {
    if (controllerCache.value.has(albumId)) return controllerCache.value.get(albumId)

    const provider = new AlbumTimelineProvider(albumId)
    const controller = createTimelineController(provider)
    controllerCache.value.set(albumId, controller)
    triggerRef(controllerCache)
  }

  async function fetchUserAlbums() {
    if (fetchingUserAlbums.value) {
      console.warn('NOT FETCHING USER ALBUMS')
      return
    }
    fetchingUserAlbums.value = true
    try {
      await refreshUserAlbums()
    } catch (e) {
      snackbarStore.error('Failed to fetch user albums.', e as Error)
    } finally {
      fetchingUserAlbums.value = false
    }
  }

  async function refreshUserAlbums() {
    const now = performance.now()
    try {
      const { data } = await albumService.getUserAlbums()
      userAlbums.value = data
    } finally {
      console.log('refreshUserAlbums', performance.now() - now, 'ms')
      fetchingUserAlbums.value = true
    }
  }

  async function updateAlbumDetails(albumId: string, albumDetails: UpdateAlbumRequest) {
    try {
      await albumService.updateAlbum(albumId, albumDetails)
      // await fetchAlbumDetails(albumId)
      requestIdleCallback(() => refreshUserAlbums())
    } catch (e) {
      snackbarStore.error(`Failed to update album: ${albumId}.`, e as Error)
    }
  }

  return {
    userAlbums,
    fetchUserAlbums,
    controllerCache,
    updateAlbumDetails,
    createController,
  }
})
