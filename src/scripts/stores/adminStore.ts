import { ref, type Ref } from 'vue'
import { defineStore } from 'pinia'
import adminService from '@/scripts/services/adminService.ts'
import type {
  DiskResponse,
  MediaSampleResponse,
  UnsupportedFilesResponse,
  AdminUserInfo,
} from '@/scripts/types/api/onboarding.ts'
import { usePickFolderStore } from '@/scripts/stores/pickFolderStore.ts'
import { useSnackbarsStore } from '@/scripts/stores/snackbarStore.ts'
import { useAuthStore } from '@/scripts/stores/authStore.ts'

export const useAdminStore = defineStore('admin', () => {
  // --- STATE ---
  const disks: Ref<DiskResponse | null> = ref(null)
  const isLoading: Ref<boolean> = ref(false)
  const folders: Ref<string[] | null> = ref(null)
  const mediaSamples: Ref<MediaSampleResponse | null> = ref(null)
  const unsupportedFiles: Ref<UnsupportedFilesResponse | null> = ref(null)

  // Administration state
  const users: Ref<AdminUserInfo[]> = ref([])
  const isUsersLoading: Ref<boolean> = ref(false)

  const snackbarStore = useSnackbarsStore()
  const authStore = useAuthStore()

  async function fetchDiskInfo() {
    isLoading.value = true
    try {
      const response = await adminService.getDisks()
      disks.value = response.data
    } catch (error) {
      snackbarStore.error('Failed to fetch disk info', error)
    } finally {
      isLoading.value = false
    }
  }

  // --- USER ADMINISTRATION ACTIONS ---

  async function fetchUsers() {
    isUsersLoading.value = true
    try {
      const response = await adminService.getAdminUsers()
      users.value = response.data
    } catch (error) {
      snackbarStore.error('Failed to fetch user list', error)
    } finally {
      isUsersLoading.value = false
    }
  }

  async function updateUserFolder(userId: number, userFolder: string) {
    try {
      await adminService.updateUserMediaFolder(userId, userFolder)

      // Update locally
      const user = users.value.find((u) => u.id === userId)
      if (user) {
        user.mediaFolder = userFolder
      }

      // Update logged-in user if changing our own folder
      if (authStore.user && authStore.user.id === userId) {
        authStore.user.mediaFolder = userFolder
      }
    } catch (error) {
      snackbarStore.error('Failed to update media folder', error)
      throw error
    }
  }

  async function deleteUser(userId:  number) {
    try {
      await adminService.deleteUser(userId)
      // Filter out locally
      users.value = users.value.filter((u) => u.id !== userId)
    } catch (error) {
      snackbarStore.error('Failed to delete user', error)
      throw error
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
    users,
    isUsersLoading,
    // Actions
    fetchDiskInfo,
    fetchUsers,
    updateUserMediaFolder: updateUserFolder,
    deleteUser,
  }
})
