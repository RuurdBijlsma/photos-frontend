import { defineStore } from 'pinia'
import { photosApi } from '@/utils/api/PhotosApi'
import { errorNotify } from '@/utils/errorHandling'
import { type Ref, ref } from 'vue'
import type { UserFolderResponse } from '@/utils/types/api'

export const usePickFolderStore = defineStore(
  'pickFolder',
  () => {
    let N_SAMPLES = 8
    const listFolderLoading = ref(false)
    const folderList: Ref<string[]> = ref([])
    const viewedFolder: Ref<string[]> = ref([])
    const folderInfo: Ref<UserFolderResponse | null> = ref(null)
    const folderInfoLoading = ref(false)
    const samples: Ref<string[]> = ref(Array(N_SAMPLES))

    async function openFolder(folder: string) {
      viewedFolder.value.push(folder)
      await refreshFolders()
    }

    async function truncateViewed(index: number) {
      viewedFolder.value = viewedFolder.value.slice(0, index)
      await refreshFolders()
    }

    async function refreshFolders() {
      refreshInfo().then()
      listFolderLoading.value = true
      const result = await photosApi.getFolders(viewedFolder.value.join('/'))
      listFolderLoading.value = false
      if (!result.ok) {
        await truncateViewed(viewedFolder.value.length - 2)
        return errorNotify(result.error)
      }
      folderList.value = result.value
    }

    async function getImageUrl(file: string): Promise<string> {
      const result = await photosApi.rawMediaUrl(file)
      if (result.ok) {
        return result.value
      }
      console.warn("Couldn't get image url", result)
      return 'img/placeholder.svg'
    }

    async function refreshInfo() {
      const requestFolder = viewedFolder.value.join('/')

      folderInfoLoading.value = true
      const result = await photosApi.getUserFolderInfo(requestFolder)
      folderInfoLoading.value = false

      if (!result.ok) {
        console.warn('error getting validate folders result', result)
        return
      }
      // Ignore result if the viewed folder has changed since making the request
      if (viewedFolder.value.join('/') !== requestFolder) return

      folderInfo.value = result.value

      N_SAMPLES = result.value.samples.length
      if (samples.value.length > N_SAMPLES) {
        samples.value = samples.value.slice(0, N_SAMPLES)
      } else if (samples.value.length < N_SAMPLES) {
        samples.value.concat(Array(N_SAMPLES - samples.value.length))
      }
      let j = 0
      for (let i = 0; i < N_SAMPLES; i++) {
        getImageUrl(result.value.samples[i]).then(imageUrl => {
          if (viewedFolder.value.join('/') !== requestFolder) return
          samples.value[j++] = imageUrl
        })
      }
    }

    return {
      refreshFolders,
      openFolder,
      truncateViewed,
      refreshInfo,
      folderInfoLoading,
      folderInfo,
      samples,
      listFolderLoading,
      viewedFolder,
      folderList,
    }
  },
  {
    persist: {
      pick: [],
      storage: localStorage,
    },
  },
)
