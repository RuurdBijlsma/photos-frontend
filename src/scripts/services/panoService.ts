import type { AxiosResponse } from 'axios'
import apiClient from './api.ts'
import type { PannellumConfig } from '@/scripts/types/api/pannellumConfig.ts'

const panoService = {
  getConfig(mediaItemId: string): Promise<AxiosResponse<PannellumConfig>> {
    return apiClient.get<PannellumConfig>(`/thumbnails/${mediaItemId}/pano/config.json`)
  },
}

export default panoService
