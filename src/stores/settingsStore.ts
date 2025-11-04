import { ref, watch } from 'vue'
import { defineStore } from 'pinia'

export const useSettingStore = defineStore('settings', () => {
  const useImageGlow = ref(
    localStorage.getItem('settingsImageGlow') === null
      ? false
      : localStorage.settingsImageGlow === 'true',
  )
  const useBackdropBlur = ref(
    localStorage.getItem('settingsBackdropBlur') === null
      ? false
      : localStorage.settingsBackdropBlur === 'true',
  )
  watch(useImageGlow, () => (localStorage.settingsImageGlow = useImageGlow.value.toString()))
  watch(useBackdropBlur, () => (localStorage.settingsBackdropBlur = useBackdropBlur.value.toString()))

  return {
    // State
    useImageGlow,
    useBackdropBlur,
    // Actions
  }
})
