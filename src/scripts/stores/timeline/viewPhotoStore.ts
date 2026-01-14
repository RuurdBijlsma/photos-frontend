import { defineStore } from 'pinia'
import { shallowRef } from 'vue'

export const useViewPhotoStore = defineStore('viewPhoto', () => {
  const ids = shallowRef<string[]>([])

  return {
    ids,
  }
})
