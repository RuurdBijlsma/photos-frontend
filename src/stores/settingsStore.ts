import { ref, watch } from 'vue'
import { defineStore } from 'pinia'

export const useSettingStore = defineStore('settings', () => {
  const useImageGlow = ref(
    localStorage.getItem('settingsImageGlow') === null
      ? false
      : localStorage.settingsImageGlow === 'true',
  )
  watch(useImageGlow, () => (localStorage.settingsImageGlow = useImageGlow.value.toString()))

  return {
    // State
    useImageGlow,
    // Actions
  }
})
