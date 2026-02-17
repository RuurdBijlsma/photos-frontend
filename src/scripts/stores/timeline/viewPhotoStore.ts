import { defineStore } from 'pinia'
import { ref, shallowRef } from 'vue'

export const useViewPhotoStore = defineStore('viewPhoto', () => {
  const viewLink = ref<string>('')
  const ids = shallowRef<string[]>([])
  const scrollToDate = ref<Date|null>(null)

  return {
    scrollToDate,
    viewLink,
    ids,
  }
})
