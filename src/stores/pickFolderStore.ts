import { defineStore } from 'pinia'
import { type Ref, ref } from 'vue'
import { debounce } from '@/utils/utils'
import type { MediaSampleResponse, UnsupportedFilesResponse } from '@/utils/types/api'
import { useSetupStore } from '@/stores/setupStore.ts'
import setupService from '@/script/services/setupService.ts'

export const usePickFolderStore = defineStore(
  'pickFolder',
  () => {
    let N_SAMPLES = 8
    const unsupportedFilesLoading = ref(false)
    const mediaSampleLoading = ref(false)
    const listFolderLoading = ref(false)
    const makeFolderLoading = ref(false)

    const folderList: Ref<string[]> = ref([])
    const viewedFolder: Ref<string[]> = ref([])
    const mediaSamples: Ref<MediaSampleResponse | null> = ref(null)
    const unsupportedFiles: Ref<UnsupportedFilesResponse | null> = ref(null)
    const samples: Ref<{ imageUrl: string; relPath: string }[]> = ref(
      [...Array(N_SAMPLES)].map(() => ({ imageUrl: '', relPath: '' })),
    )
    const setupStore = useSetupStore()

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
      const folder = viewedFolder.value.join('/')
      try {
        await setupStore.fetchFolders(folder)
      } catch (e) {
        await truncateViewed(viewedFolder.value.length - 2)
        console.error(`Could not refresh folders for folder: ${folder}`, e)
      }
      if (setupStore.folders !== null) {
        folderList.value = setupStore.folders
      }
      dbRefreshMediaSample()
    }

    async function getImageUrl(relative_path: string): Promise<string> {
      const url = await setupStore.mediaBlobUrl(relative_path)
      if (url !== null) {
        return url
      }
      return 'img/placeholder.svg'
    }

    async function refreshMediaSample() {
      const requestFolder = viewedFolder.value.join('/')

      mediaSampleLoading.value = true
      await setupStore.fetchMediaSamples(requestFolder)
      mediaSampleLoading.value = false
      // Ignore result if the viewed folder has changed since making the request
      if (viewedFolder.value.join('/') !== requestFolder || setupStore.mediaSamples === null) return

      mediaSamples.value = setupStore.mediaSamples
      console.log(JSON.parse(JSON.stringify(mediaSamples.value?.samples)))

      N_SAMPLES = mediaSamples.value.samples.length
      if (samples.value.length > N_SAMPLES) {
        samples.value = samples.value.slice(0, N_SAMPLES)
      } else if (samples.value.length < N_SAMPLES) {
        samples.value.concat(Array(N_SAMPLES - samples.value.length))
      }
      let j = 0
      for (let i = 0; i < N_SAMPLES; i++) {
        const relPath = mediaSamples.value.samples[i]
        if (relPath === undefined) continue
        getImageUrl(relPath).then((imageUrl) => {
          if (viewedFolder.value.join('/') !== requestFolder) return
          samples.value[j++] = { imageUrl, relPath }
        })
      }
    }

    async function refreshUnsupportedFiles() {
      const requestFolder = viewedFolder.value.join('/')

      unsupportedFilesLoading.value = true
      await setupStore.fetchUnsupportedFiles(requestFolder)
      unsupportedFilesLoading.value = false
      // Ignore result if the viewed folder has changed since making the request
      if (viewedFolder.value.join('/') !== requestFolder) return

      unsupportedFiles.value = setupStore.unsupportedFiles
    }

    async function makeFolder(folderName: string) {
      makeFolderLoading.value = true
      const baseFolder = viewedFolder.value.join('/')

      try {
        await setupService.makeFolder({ base_folder: baseFolder, new_name: folderName })
      } catch (e) {
        console.error("Can't make folder", e)
      } finally {
        makeFolderLoading.value = false
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
