import { defineStore } from 'pinia'
import { shallowRef } from 'vue'
import type { AlbumWithCount } from '@/scripts/types/api/album.ts'

export const useAlbumStore = defineStore('album', () => {
  const userAlbums = shallowRef<AlbumWithCount[]>([])

  async function fetchUserAlbums() {
    return []
  }

  return {
    userAlbums,

    fetchUserAlbums,
  }
})
