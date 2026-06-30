import { shallowRef, triggerRef } from 'vue'
import { defineStore } from 'pinia'
import { useSnackbarsStore } from '@/scripts/stores/snackbarStore.ts'
import type { PannellumConfig } from '@/scripts/types/api/pannellumConfig.ts'
import panoService from '@/scripts/services/panoService.ts'
import type { AxiosResponse } from 'axios'

export const usePanoStore = defineStore('pano', () => {
  const snackbarStore = useSnackbarsStore()

  const configs = shallowRef(new Map<string, PannellumConfig>())
  const configPromises = new Map<string, Promise<AxiosResponse<PannellumConfig>>>()

  async function fetchConfig(mediaItemId: string, useCache = true) {
    if (configPromises.has(mediaItemId)) {
      await configPromises.get(mediaItemId)!
      return
    }
    if (useCache && configs.value.has(mediaItemId)) return

    try {
      const promise = panoService.getConfig(mediaItemId)
      configPromises.set(mediaItemId, promise)
      const response = await promise
      console.log('Pano Config', response.data)
      configPromises.delete(mediaItemId)
      configs.value.set(mediaItemId, response.data)
      triggerRef(configs)
    } catch (error) {
      snackbarStore.error("Can't fetch panorama info", error)
    }
  }

  return {
    configs,
    fetchConfig,
  }
})
