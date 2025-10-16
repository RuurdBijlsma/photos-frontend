import { ref, type Ref } from 'vue'
import { defineStore } from 'pinia'
import setupService from '@/script/services/setupService.ts'
import type { DiskResponse } from '@/script/types/api/setup.ts'

export const useSetupStore = defineStore('setup', () => {
  // --- STATE ---
  const needsWelcome: Ref<boolean | null> = ref(null)
  const disks: Ref<DiskResponse | null> = ref(null)
  const isLoading: Ref<boolean> = ref(false)

  // --- ACTIONS ---
  async function checkWelcomeStatus() {
    if (localStorage.getItem('welcomeNeeded') === 'false') {
      needsWelcome.value = false
      return
    }
    isLoading.value = true
    try {
      const response = await setupService.isWelcomeNeeded()
      needsWelcome.value = response.data
      localStorage.setItem('welcomeNeeded', response.data.toString())
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
    needsWelcome,
    disks,
    isLoading,
    // Actions
    checkWelcomeStatus: checkWelcomeStatus,
    fetchDiskInfo,
  }
})
