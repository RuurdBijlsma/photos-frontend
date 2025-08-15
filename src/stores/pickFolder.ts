import { defineStore } from 'pinia'
import { photosApi } from '@/utils/api/PhotosApi'
import { errorNotify } from '@/utils/errorHandling'
import { type Ref, ref } from 'vue'
import { debounce } from '@/utils/utils'
import type {
  MediaSampleResponse,
  UnsupportedFilesResponse,
} from '@/utils/types/api'

export const usePickFolderStore = defineStore(
  'pickFolder',
  () => {
    let N_SAMPLES = 8
    const listFolderLoading = ref(false)
    const folderList: Ref<string[]> = ref([])
    const viewedFolder: Ref<string[]> = ref([])
    const mediaSamples: Ref<MediaSampleResponse | null> = ref(null)
    const mediaSampleLoading = ref(false)
    const unsupportedFiles: Ref<UnsupportedFilesResponse | null> = ref(null)
    const unsupportedFilesLoading = ref(false)
    const samples: Ref<string[]> = ref(Array(N_SAMPLES))

    const dbRefreshMediaSample = debounce(refreshMediaSample, 500)

    async function openFolder(folder: string) {
      viewedFolder.value.push(folder)
      await refreshFolders()
    }

    async function truncateViewed(index: number) {
      viewedFolder.value = viewedFolder.value.slice(0, index)
      await refreshFolders()
    }

    async function refreshFolders() {
      listFolderLoading.value = true
      const result = await photosApi.getFolders(viewedFolder.value.join('/'))
      listFolderLoading.value = false
      if (!result.ok) {
        await truncateViewed(viewedFolder.value.length - 2)
        return errorNotify(result.error)
      }
      folderList.value = result.value
      dbRefreshMediaSample()
    }

    async function getImageUrl(file: string): Promise<string> {
      const result = await photosApi.rawMediaUrl(file)
      if (result.ok) {
        return result.value
      }
      console.warn("Couldn't get image url", result)
      return 'img/placeholder.svg'
    }

    async function refreshMediaSample() {
      const requestFolder = viewedFolder.value.join('/')

      mediaSampleLoading.value = true
      const result = await photosApi.getMediaSample(requestFolder)
      mediaSampleLoading.value = false

      if (!result.ok) {
        console.warn('error getting media sample result', result)
        return errorNotify(result.error)
      }
      // Ignore result if the viewed folder has changed since making the request
      if (viewedFolder.value.join('/') !== requestFolder) return

      mediaSamples.value = result.value

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

    async function refreshUnsupportedFiles() {
      const requestFolder = viewedFolder.value.join('/')

      unsupportedFilesLoading.value = true
      const result = await photosApi.getUnsupportedFiles(requestFolder)
      unsupportedFilesLoading.value = false

      if (!result.ok) {
        console.warn('error getting unsupported files result', result)
        return errorNotify(result.error)
      }
      // Ignore result if the viewed folder has changed since making the request
      if (viewedFolder.value.join('/') !== requestFolder) return

      unsupportedFiles.value = result.value
    }

    async function makeFolder(folderName: string) {
      const baseFolder = viewedFolder.value.join('/')

      const result = await photosApi.makeFolder(baseFolder, folderName)

      if (!result.ok) {
        console.warn('error getting unsupported files result', result)
        return errorNotify(result.error)
      }
      refreshFolders().then()
    }

    return {
      refreshFolders,
      openFolder,
      truncateViewed,
      makeFolder,
      refreshMediaSample,
      mediaSamples,
      mediaSampleLoading,
      samples,
      refreshUnsupportedFiles,
      unsupportedFiles,
      unsupportedFilesLoading,
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
