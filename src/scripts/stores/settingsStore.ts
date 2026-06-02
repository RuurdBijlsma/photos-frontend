import { defineStore } from 'pinia'
import { useStorage } from '@vueuse/core'
import type { ThemeType, ThemeVariant } from '@/scripts/constants.ts'

export const useSettingStore = defineStore('settings', () => {
  // UI -> Photo Viewer
  const useImageGlow = useStorage('settingsImageGlow', false)
  const darkPhotoViewer = useStorage('settingsDarkPhotoViewer', true)
  // UI -> General
  const useBackdropBlur = useStorage('settingsBackdropBlur', true)
  // UI -> Timeline
  const timelineRowHeight = useStorage('settingsTimelineRowHeight', 320)
  const timelineUseDayLabels = useStorage('settingsTimelineUseDayLabels', true)
  // Theme -> Mode
  const themeString = useStorage<ThemeType>('theme', 'system')
  const enableLightThemeTime = useStorage('enableLightThemeTime', '07:00')
  const enableDarkThemeTime = useStorage('enableDarkThemeTime', '19:00')
  const useSunSchedule = useStorage('useSunSchedule', false)
  // Theme -> Color
  const imageBackground = useStorage('settingsImageBackground', true)
  const customThemeColor = useStorage('settingsCustomThemeColor', '#462de8')
  const customThemeVariant = useStorage<ThemeVariant>('settingsCustomThemeVariant', 'Vibrant')

  return {
    useImageGlow,
    useBackdropBlur,
    imageBackground,
    customThemeColor,
    customThemeVariant,
    timelineRowHeight,
    timelineUseDayLabels,
    darkPhotoViewer,
    themeString,
    useSunSchedule,
    enableLightThemeTime,
    enableDarkThemeTime,
  }
})
