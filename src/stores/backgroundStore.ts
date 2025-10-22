// src/stores/backgroundStore.ts

import { ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { useThemeStore } from '@/stores/themeStore'
import { useAuthStore } from '@/stores/authStore'
import photosService from '@/script/services/photosService'
import type { Theme } from '@/script/types/themeColor.ts'

// The single key we will use for localStorage
const CACHE_KEY = 'cachedBackgroundData'
const DEFAULT_IMAGE_URL = 'img/etna.jpg'

// The structure of our cached data
interface CachedBackground {
  url: string
  theme: Theme
}

export const useBackgroundStore = defineStore('background', () => {
  // --- STATE ---
  const backgroundUrl = ref(DEFAULT_IMAGE_URL)
  const hasFetchedForThisSession = ref(false)

  // --- STORES ---
  const themeStore = useThemeStore()
  const authStore = useAuthStore()

  // --- PRIVATE HELPERS ---

  const fetchAndCacheNextBackground = async () => {
    if (hasFetchedForThisSession.value) return
    hasFetchedForThisSession.value = true

    try {
      const response = await photosService.getRandomPhoto()
      const photo = response.data
      if (photo === null) {
        console.warn('getRandomPhoto returned null, probably no photos in DB with a theme.')
        return
      }

      const newBgUrl = photosService.getPhotoThumbnail(photo.mediaId, 1080)
      const newTheme = photo.themes?.[0]

      if (newTheme) {
        // Create a single object containing the coupled data
        const newCachedData: CachedBackground = {
          url: newBgUrl,
          theme: newTheme,
        }
        localStorage.setItem(CACHE_KEY, JSON.stringify(newCachedData))
        console.log('Fetched and cached new background object for next session.')
      } else {
        console.warn('NO theme in the random photo result, not using it.')
      }
    } catch (error) {
      console.error('Failed to fetch and cache next background:', error)
    }
  }

  // --- ACTION ---

  function initialize() {
    // --- Step 1: Immediately load the UI from the single cache entry ---
    const storedData = localStorage.getItem(CACHE_KEY)

    if (storedData) {
      try {
        // Parse the entire object
        const parsedData = JSON.parse(storedData) as CachedBackground
        // Apply both the background and theme from the same source
        backgroundUrl.value = parsedData.url
        themeStore.setThemesFromJson(parsedData.theme)
      } catch (e) {
        console.warn("Couldn't parse or apply cached background data.", e)
        // If parsing fails, we fall back to the defaults.
      }
    }

    // --- Step 2: Fetch fresh data for the next session ---
    if (authStore.isAuthenticated) {
      fetchAndCacheNextBackground()
    }

    watch(
      () => authStore.isAuthenticated,
      (isNowAuthenticated) => {
        if (isNowAuthenticated) {
          fetchAndCacheNextBackground()
        }
      },
    )
  }

  return {
    backgroundUrl,
    initialize,
  }
})
