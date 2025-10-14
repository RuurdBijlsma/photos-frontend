import { ref, type Ref } from 'vue'
import { defineStore } from 'pinia'
import setupService from '@/script/services/setupService.ts'
import type { DiskResponse } from '@/script/types/api/setup.ts'

export const useSetupStore = defineStore('setup', () => {
  // --- STATE ---
  const needsSetup: Ref<boolean | null> = ref(null)
  const disks: Ref<DiskResponse | null> = ref(null)
  const isLoading: Ref<boolean> = ref(false)

  // --- ACTIONS ---
  async function checkSetupStatus() {
    if (localStorage.getItem('setup-needed') === 'false') {
      needsSetup.value = false
      return
    }
    isLoading.value = true
    try {
      const response = await setupService.isSetupNeeded()
      needsSetup.value = response.data
      localStorage.setItem('setup-needed', response.data.toString())
    } catch (error) {
      console.error('Failed to check setup status:', error)
      // Optionally set an error state here
    } finally {
      isLoading.value = false
    }
  }

  async function fetchDiskInfo() {
    isLoading.value = true
    try {
      const response = await setupService.getDisks()
      disks.value = response.data
    } catch (error) {
      console.error('Failed to fetch disk info:', error)
    } finally {
      isLoading.value = false
    }
  }

  // --- RETURN ---
  return {
    // State
    needsSetup,
    disks,
    isLoading,
    // Actions
    checkSetupStatus,
    fetchDiskInfo,
  }
})
