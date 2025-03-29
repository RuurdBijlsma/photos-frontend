import { defineStore } from 'pinia'

export const usePickFolderStore = defineStore(
  'pickFolder',
  () => {
    async function getFolders(folder: string): Promise<string[]> {}

    return {
      getFolders,
    }
  },
  {
    persist: {
      pick: [],
      storage: localStorage,
    },
  },
)
