import { ref, type Ref } from 'vue'
import { defineStore } from 'pinia'
import setupService from '@/script/services/setupService.ts'
import type {
  DiskResponse,
  MediaSampleResponse,
  UnsupportedFilesResponse,
} from '@/script/types/api/setup.ts'
import { usePickFolderStore } from '@/stores/pickFolderStore.ts'

export const useSetupStore = defineStore('setup', () => {
  // --- STATE ---
  const needsWelcome: Ref<boolean | null> = ref(null)
  const disks: Ref<DiskResponse | null> = ref(null)
  const isLoading: Ref<boolean> = ref(false)
  const folders: Ref<string[] | null> = ref(null)
  const mediaSamples: Ref<MediaSampleResponse | null> = ref(null)
  const unsupportedFiles: Ref<UnsupportedFilesResponse | null> = ref(null)

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

  async function startProcessing() {
    const pickFolderStore = usePickFolderStore()
    isLoading.value = true
    const userFolder = pickFolderStore.viewedFolder.join('/')
    try {
      await setupService.startProcessing({ user_folder: userFolder })
    } catch (error) {
      console.error(`Failed to start processing processing:`, error)
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
    folders,
    mediaSamples,
    unsupportedFiles,
    // Actions
    checkWelcomeStatus,
    fetchDiskInfo,
    startProcessing,
  }
})
