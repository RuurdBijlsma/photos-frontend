// src/stores/backgroundStore.ts

import { ref, shallowRef, watch } from 'vue'
import { defineStore } from 'pinia'
import { useThemeStore } from '@/stores/themeStore'
import { useAuthStore } from '@/stores/authStore'
import type { Theme } from '@/script/types/themeColor.ts'
import photoService from '@/script/services/photoService.ts'
import { useSettingStore } from '@/stores/settingsStore.ts'
import { useSnackbarsStore } from '@/stores/snackbarStore.ts'

// The single key we will use for localStorage
const BG_CACHE_KEY = 'cachedBackgroundData'
const COLOR_CACHE_KEY = 'cacheColorData'
const DEFAULT_IMAGE_URL = 'img/etna.jpg'

export const useBackgroundStore = defineStore('background', () => {
  // --- STATE ---
  const backgroundUrl = ref(DEFAULT_IMAGE_URL)
  const hasFetchedForThisSession = ref(false)
  const backgroundTheme = shallowRef<Theme | null>(null)
  const colorTheme = shallowRef<Theme | null>(null)

  // --- STORES ---
  const themeStore = useThemeStore()
  const authStore = useAuthStore()
  const settings = useSettingStore()
  const snackbarStore = useSnackbarsStore()

  // --- PRIVATE HELPERS ---

  const fetchAndCacheNextBackground = async () => {
    if (hasFetchedForThisSession.value) return
    hasFetchedForThisSession.value = true

    try {
      const response = await photoService.getRandomPhoto()
      const photo = response.data
      if (photo === null) {
        console.warn('getRandomPhoto returned null, probably no photos in DB with a theme.')
        return
      }

      const newBgUrl = photoService.getPhotoThumbnail(photo.mediaId, 1080)
      const newTheme = photo.themes?.[0]

      if (newTheme) {
        // Create a single object containing the coupled data
        const newCachedData = {
          url: newBgUrl,
          theme: newTheme,
        }
        localStorage.setItem(BG_CACHE_KEY, JSON.stringify(newCachedData))
        console.log('Fetched and cached new background object for next session.')
      } else {
        console.warn('NO theme in the random photo result, not using it.')
      }
    } catch (error) {
      console.error('Failed to fetch and cache next background:', error)
    }
  }

  const fetchColorTheme = async (color = settings.customThemeColor) => {
    // Check variable
    if (colorTheme.value && colorTheme.value.source === color) {
      return colorTheme.value
    }

    // Check localStorage
    const localItem = localStorage.getItem(COLOR_CACHE_KEY)
    if (localItem !== null) {
      const data = JSON.parse(localItem) as { color: string; theme: Theme }
      if (data.color === color) {
        colorTheme.value = data.theme
        return data.theme
      }
    }

    // Get from API
    try {
      const { data } = await photoService.getTheme(color)
      localStorage.setItem(COLOR_CACHE_KEY, JSON.stringify({ color, theme: data }))
      colorTheme.value = data
      return data
    } catch (e) {
      snackbarStore.error('Could not get theme from color', e)
    }

    // Fail
    return null
  }

  const getBackgroundTheme = () => {
    // Check variable
    if (backgroundTheme.value) return backgroundTheme.value

    // Check localStorage
    const localItem = localStorage.getItem(BG_CACHE_KEY)
    if (localItem !== null) {
      const data = JSON.parse(localItem) as { url: string; theme: Theme }
      backgroundTheme.value = data.theme
      backgroundUrl.value = data.url
      return data.theme
    }

    // Fallback
    backgroundUrl.value = DEFAULT_IMAGE_URL
    return null
  }

  const setCorrectTheme = async () => {
    const theme = settings.imageBackground ? getBackgroundTheme() : await fetchColorTheme()
    if (theme) themeStore.setThemesFromJson(theme)
  }

  watch(
    () => settings.customThemeColor,
    () => setCorrectTheme(),
  )

  watch(
    () => settings.imageBackground,
    () => setCorrectTheme(),
  )

  // --- ACTION ---

  function initialize() {
    // --- Step 1: Immediately load the UI from the single cache entry ---
    setCorrectTheme().then()

    requestIdleCallback(() => {
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
    })
  }

  return {
    backgroundUrl,
    initialize,
    backgroundTheme,
    colorTheme,
  }
})
