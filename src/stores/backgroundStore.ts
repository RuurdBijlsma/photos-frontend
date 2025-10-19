// src/stores/backgroundStore.ts

import { ref } from 'vue'
import { defineStore } from 'pinia'
import { usePhotosStore } from '@/stores/photosStore'
import { useThemeStore } from '@/stores/themeStore'
import { useAuthStore } from '@/stores/authStore'
import photosService from '@/script/services/photosService'
import { watch } from 'vue'
import type { RandomPhotoResponse } from '@/script/types/api/photos.ts'

const DEFAULT_IMAGE_URL = 'img/etna.jpg'

export const useBackgroundStore = defineStore('background', () => {
  // --- STATE ---
  const backgroundUrl = ref(DEFAULT_IMAGE_URL)
  const hasFetchedNewBackground = ref(false)

  // --- STORES ---
  const photosStore = usePhotosStore()
  const themeStore = useThemeStore()
  const authStore = useAuthStore()

  // --- PRIVATE HELPERS ---
  const applyNewBackground = (photo: RandomPhotoResponse | null) => {
    if (!photo?.media_id) return

    const newBgUrl = photosService.getPhotoThumbnail(photo.media_id, 1080)
    backgroundUrl.value = newBgUrl
    localStorage.setItem('backgroundUrl', newBgUrl)

    const newTheme = photo.themes?.[0]
    if (newTheme) {
      // Tell the themeStore to do its job
      themeStore.setThemesFromJson(newTheme)
      localStorage.setItem('imageTheme', JSON.stringify(newTheme))
    }
  }

  const fetchAndApplyNewBackground = async () => {
    if (hasFetchedNewBackground.value) return
    hasFetchedNewBackground.value = true
    await photosStore.refreshRandomPhoto()
    applyNewBackground(photosStore.randomPhoto)
  }

  // --- ACTIONS ---

  /**
   * Initializes the background manager.
   * Should be called once in the root App component.
   */
  function initialize() {
    // 1. Immediately load persisted background URL.
    const storedBg = localStorage.getItem('backgroundUrl')
    if (storedBg) {
      backgroundUrl.value = storedBg
    }

    // 2. If already logged in, fetch a new background immediately.
    if (authStore.isAuthenticated) {
      fetchAndApplyNewBackground()
    }

    // 3. Watch for the user logging in to fetch a background.
    watch(
      () => authStore.isAuthenticated,
      (isNowAuthenticated) => {
        if (isNowAuthenticated && !hasFetchedNewBackground.value) {
          fetchAndApplyNewBackground()
        }
      },
    )
  }

  return {
    // State
    backgroundUrl,
    // Actions
    initialize,
  }
})
