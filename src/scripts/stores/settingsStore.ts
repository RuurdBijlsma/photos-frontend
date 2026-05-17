import { defineStore } from 'pinia'
import { useStorage } from '@vueuse/core'

export const useSettingStore = defineStore('settings', () => {
  const useImageGlow = useStorage('settingsImageGlow', false)
  const useBackdropBlur = useStorage('settingsBackdropBlur', true)
  const imageBackground = useStorage('settingsImageBackground', true)
  const customThemeColor = useStorage('settingsCustomThemeColor', '#462de8')
  const timelineRowHeight = useStorage('settingsTimelineRowHeight', 240)
  const timelineUseDayLabels = useStorage('settingsTimelineUseDayLabels', true)

  return {
    useImageGlow,
    useBackdropBlur,
    imageBackground,
    customThemeColor,
    timelineRowHeight,
    timelineUseDayLabels,
  }
})
