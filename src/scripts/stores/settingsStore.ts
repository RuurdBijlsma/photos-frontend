import { defineStore } from 'pinia'
import { useStorage } from '@vueuse/core'
import type { ThemeType, ThemeVariant } from '@/scripts/constants.ts'

export const useSettingStore = defineStore('settings', () => {
  const useImageGlow = useStorage('settingsImageGlow', false)
  const useBackdropBlur = useStorage('settingsBackdropBlur', true)
  const imageBackground = useStorage('settingsImageBackground', true)
  const customThemeColor = useStorage('settingsCustomThemeColor', '#462de8')
  const customThemeVariant = useStorage<ThemeVariant>('settingsCustomThemeVariant', 'Vibrant')
  const timelineRowHeight = useStorage('settingsTimelineRowHeight', 320)
  const timelineUseDayLabels = useStorage('settingsTimelineUseDayLabels', true)
  const darkPhotoViewer = useStorage('settingsDarkPhotoViewer', true)
  const themeString = useStorage<ThemeType>('theme', 'system')
  const useSunSchedule = useStorage('useSunSchedule', false)
  const enableLightThemeTime = useStorage('enableLightThemeTime', '07:00')
  const enableDarkThemeTime = useStorage('enableDarkThemeTime', '19:00')

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
