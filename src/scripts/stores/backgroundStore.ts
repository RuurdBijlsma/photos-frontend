import { ref, shallowRef, watch } from 'vue'
import { defineStore } from 'pinia'
import { useThemeStore } from '@/scripts/stores/themeStore.ts'
import { useAuthStore } from '@/scripts/stores/authStore.ts'
import type { Theme } from '@/scripts/types/themeColor.ts'
import { useSettingStore } from '@/scripts/stores/settingsStore.ts'
import { useSnackbarsStore } from '@/scripts/stores/snackbarStore.ts'
import mediaItemService from '@/scripts/services/mediaItemService.ts'
import type { ThemeVariant } from '@/scripts/constants.ts'
import { useThrottleFn } from '@vueuse/core'

// The single key we will use for localStorage
const BG_CACHE_KEY = 'cachedBackgroundData'
const DEFAULT_IMAGE_URL = '/img/etna.jpg'
type CachedBackgroundData = { url: string; theme: Theme; variant: ThemeVariant }

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

  function getCachedBackgroundData() {
    const localItem = localStorage.getItem(BG_CACHE_KEY)
    if (localItem === null) return null

    try {
      return JSON.parse(localItem) as CachedBackgroundData | { url: string; theme: Theme }
    } catch {
      localStorage.removeItem(BG_CACHE_KEY)
      return null
    }
  }

  async function fetchAndCacheNextBackground(force = false) {
    if (hasFetchedForThisSession.value && !force) return
    hasFetchedForThisSession.value = true

    try {
      const variant = settings.customThemeVariant
      const response = await mediaItemService.getRandomPhoto(variant)
      const photo = response.data
      if (photo === null) {
        console.warn('getRandomPhoto returned null, probably no photos in DB with color data.')
        return
      }

      const newBgUrl = mediaItemService.getPhotoThumbnail(photo.mediaId, 1080, false)
      const newTheme = photo.theme

      if (newTheme) {
        // Create a single object containing the coupled data
        const newCachedData: CachedBackgroundData = {
          url: newBgUrl,
          theme: newTheme,
          variant,
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

  async function fetchColorTheme(
    color = settings.customThemeColor,
    variant = settings.customThemeVariant,
  ) {
    // Check variable
    if (
      colorTheme.value &&
      colorTheme.value.source_color == color &&
      colorTheme.value.variant === variant
    ) {
      return colorTheme.value
    }

    // Get from API
    try {
      const { data } = await mediaItemService.getTheme(color, variant)
      colorTheme.value = data
      return data
    } catch (e) {
      snackbarStore.error('Could not get theme from color', e)
    }

    // Fail
    return null
  }

  async function refreshCurrentBackgroundTheme() {
    const sourceColor = backgroundTheme.value?.source_color
    if (!sourceColor) {
      return
    }

    try {
      const { data } = await mediaItemService.getTheme(sourceColor, settings.customThemeVariant)
      backgroundTheme.value = data
      localStorage.setItem(
        BG_CACHE_KEY,
        JSON.stringify({
          url: backgroundUrl.value,
          theme: data,
          variant: settings.customThemeVariant,
        } satisfies CachedBackgroundData),
      )
      themeStore.setThemesFromJson(data)
      return data
    } catch (e) {
      snackbarStore.error('Could not update background theme variant', e)
      return
    }
  }

  function getBackgroundTheme() {
    // Check variable
    if (backgroundTheme.value) return backgroundTheme.value

    // Check localStorage
    const data = getCachedBackgroundData()
    if (data !== null) {
      if ('variant' in data && data.variant === settings.customThemeVariant) {
        backgroundTheme.value = data.theme
        backgroundUrl.value = data.url
        return data.theme
      }
    }

    // Fallback
    backgroundUrl.value = DEFAULT_IMAGE_URL
    return null
  }

  async function setCorrectTheme() {
    const theme = settings.imageBackground ? getBackgroundTheme() : await fetchColorTheme()
    if (theme) themeStore.setThemesFromJson(theme)
  }

  watch(
    () => settings.customThemeColor,
    () => setCorrectTheme(),
  )

  watch(
    () => settings.customThemeVariant,
    async () => {
      if (settings.imageBackground) {
        await refreshCurrentBackgroundTheme()
      } else {
        await setCorrectTheme()
      }
      if (settings.imageBackground && authStore.isAuthenticated) {
        fetchAndCacheNextBackground(true)
      }
    },
  )

  const throttledTheme = useThrottleFn(setCorrectTheme, 50, true, true)

  watch(
    () => settings.imageBackground,
    () => {
      return throttledTheme()
    },
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
