import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useSearchStore = defineStore('search', () => {
  const searchImage = ref<File | null>(null)

  return {
    searchImage,
  }
})
