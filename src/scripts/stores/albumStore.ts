import { ref, shallowRef, triggerRef } from 'vue'
import { defineStore } from 'pinia'
import type {
  AlbumDetailsResponse,
  AlbumWithCount,
  UpdateAlbumRequest,
} from '@/scripts/types/api/album.ts'
import albumService from '@/scripts/services/albumService.ts'
import { useSnackbarsStore } from '@/scripts/stores/snackbarStore.ts'

export const useAlbumStore = defineStore('album', () => {
  const userAlbums = ref<AlbumWithCount[]>([])
  const cache = shallowRef(new Map<string, AlbumDetailsResponse>())
  const fetchingUserAlbums = ref(false)
  const fetchingAlbumDetails = ref<Set<string>>(new Set())

  const snackbarStore = useSnackbarsStore()

  async function fetchUserAlbums() {
    if (fetchingUserAlbums.value){
      console.warn("NOT FETCHING USER ALBUMS")
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
      await fetchAlbumDetails(albumId)
      requestIdleCallback(() => refreshUserAlbums())
    } catch (e) {
      snackbarStore.error(`Failed to update album: ${albumId}.`, e as Error)
    }
  }

  async function fetchAlbumDetails(albumId: string) {
    if (fetchingAlbumDetails.value.has(albumId)){
      console.warn("Not updating album details!")
      return
    }
    fetchingAlbumDetails.value.add(albumId)
    const now = performance.now()
    try {
      const { data } = await albumService.getAlbumDetails(albumId)
      cache.value.set(albumId, data)
      triggerRef(cache)
    } catch (e) {
      snackbarStore.error(`Failed to fetch album: ${albumId}.`, e as Error)
    } finally {
      fetchingAlbumDetails.value.delete(albumId)
      console.log('fetchAlbumDetails', performance.now() - now, 'ms')
    }
  }

  return {
    userAlbums,
    cache,
    fetchUserAlbums,
    fetchAlbumDetails,
    fetchingAlbumDetails,
    updateAlbumDetails,
  }
})
