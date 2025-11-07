import { ref, watch } from 'vue'
import { defineStore } from 'pinia'

export const useSettingStore = defineStore('settings', () => {
  function usePersistentSetting<T>(key: string, defaultValue: T) {
    const load = (): T => {
      const stored = localStorage.getItem(key)
      if (stored === null) return defaultValue
      try {
        return JSON.parse(stored)
      } catch {
        // fallback for old boolean/string values
        if (stored === 'true') return true as T
        if (stored === 'false') return false as T
        if (!isNaN(Number(stored))) return Number(stored) as T
        return stored as T
      }
    }

    const state = ref<T>(load())

    watch(
      state,
      (value) => {
        localStorage.setItem(key, JSON.stringify(value))
      },
      { deep: true },
    )

    return state
  }

  const useImageGlow = usePersistentSetting('settingsImageGlow', false)
  const useBackdropBlur = usePersistentSetting('settingsBackdropBlur', false)
  const imageBackground = usePersistentSetting('settingsImageBackground', true)
  const customThemeColor = usePersistentSetting('settingsCustomThemeColor', '#732de8')
  const timelineRowHeight = usePersistentSetting('settingsTimelineRowHeight', 240)

  return {
    useImageGlow,
    useBackdropBlur,
    imageBackground,
    customThemeColor,
    timelineRowHeight,
  }
})

export type SettingsStore = ReturnType<typeof useSettingStore>
