import { ref, type Ref } from 'vue'
import { defineStore } from 'pinia'
import setupService from '@/script/services/setupService.ts'
import type {
  DiskResponse,
  MediaSampleResponse,
  UnsupportedFilesResponse,
} from '@/script/types/api/setup.ts'
import { usePickFolderStore } from '@/stores/pickFolderStore.ts'
import { useSnackbarsStore } from '@/stores/snackbarStore.ts'
import { useAuthStore } from '@/stores/authStore.ts'

export const useSetupStore = defineStore('setup', () => {
  // --- STATE ---
  const disks: Ref<DiskResponse | null> = ref(null)
  const isLoading: Ref<boolean> = ref(false)
  const folders: Ref<string[] | null> = ref(null)
  const mediaSamples: Ref<MediaSampleResponse | null> = ref(null)
  const unsupportedFiles: Ref<UnsupportedFilesResponse | null> = ref(null)
  const snackbarStore = useSnackbarsStore()
  const authStore = useAuthStore()

  async function fetchDiskInfo() {
    isLoading.value = true
    try {
      const response = await setupService.getDisks()
      disks.value = response.data
    } catch (error) {
      snackbarStore.error('Failed to fetch disk info', error)
    } finally {
      isLoading.value = false
    }
  }

  async function startProcessing() {
    const pickFolderStore = usePickFolderStore()
    isLoading.value = true
    const userFolder = pickFolderStore.viewedFolder.join('/')
    try {
      await setupService.startProcessing({ userFolder })
      if (authStore.user) {
        authStore.user = { ...authStore.user, mediaFolder: userFolder }
      }
    } catch (error) {
      snackbarStore.error(`Failed to start processing.`, error)
    } finally {
      isLoading.value = false
    }
  }

  // --- RETURN ---
  return {
    // State
    disks,
    isLoading,
    folders,
    mediaSamples,
    unsupportedFiles,
    // Actions
    fetchDiskInfo,
    startProcessing,
  }
})
