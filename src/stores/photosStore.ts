import { defineStore } from 'pinia'
import type { RandomPhotoResponse } from '@/script/types/api/photos.ts'
import type { Ref } from 'vue'
import { ref } from 'vue'
import photosService from '@/script/services/photosService.ts'

export const usePhotosStore = defineStore('photos', () => {
  // --- STATE ---
  const randomPhoto: Ref<RandomPhotoResponse | null> = ref(
    localStorage.getItem('randomPhoto') === null ? null : JSON.parse(localStorage['randomPhoto']),
  )
  const randomPhotoLoading: Ref<boolean> = ref(false)

  // --- ACTIONS ---
  async function refreshRandomPhoto() {
    randomPhotoLoading.value = true
    try {
      const response = await photosService.getRandomPhoto()
      randomPhoto.value = response.data
      localStorage.setItem('randomPhoto', JSON.stringify(response))
      console.log(response.data)
    } catch (e) {
      console.log("Can't retrieve random photo", e)
    } finally {
      randomPhotoLoading.value = false
    }
  }

  // --- RETURN ---
  return {
    // State
    randomPhoto,
    // Actions
    refreshRandomPhoto,
  }
})
