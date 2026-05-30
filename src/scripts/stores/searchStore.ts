import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export const useSearchStore = defineStore('search', () => {
  const searchImage = ref<File | null>(null)
  const imagePreview = ref<string | null>(null)

  watch(
   searchImage,
    () => {
      if (searchImage.value) {
        imagePreview.value = URL.createObjectURL(searchImage.value)
      } else if (imagePreview.value) {
        URL.revokeObjectURL(imagePreview.value)
        imagePreview.value = null
      }
    },
    { immediate: true },
  )

  return {
    searchImage,
    imagePreview,
  }
})
