import type { AxiosResponse } from 'axios'
import apiClient from './api'
import type { RandomPhotoResponse } from '@/script/types/api/photos.ts'
import { ByMonthResponse, TimelineResponse } from '@/generated/photos.ts'
import type { FullMediaItem } from '@/script/types/api/fullPhoto.ts'

// This service handles all API calls related to the initial application setup.
const photoService = {
  getPhotoThumbnail(id: string | null | undefined, size: number): string {
    if (id === null || id === undefined) return ''
    const baseUrl = apiClient.defaults.baseURL
    const path = `/thumbnails/${id}/${size}p.avif`
    return new URL(path, baseUrl).href
  },

  getRandomPhoto(): Promise<AxiosResponse<RandomPhotoResponse>> {
    return apiClient.get<RandomPhotoResponse>('/photos/random')
  },

  fetchMediaItem(id: string): Promise<AxiosResponse<FullMediaItem>> {
    return apiClient.get<FullMediaItem>('/photos/item', {
      params: { id },
    })
  },

  async getTimeline(): Promise<TimelineResponse> {
    const response = await apiClient.get('/photos/timeline', {
      responseType: 'arraybuffer',
    })
    const buffer = new Uint8Array(response.data)
    return TimelineResponse.decode(buffer)
  },

  async getMediaByMonths(months: string[]): Promise<ByMonthResponse> {
    const response = await apiClient.get('/photos/by-month', {
      responseType: 'arraybuffer',
      params: {
        months: months.join(','),
      },
    })
    const buffer = new Uint8Array(response.data)
    return ByMonthResponse.decode(buffer)
  },
}

export default photoService
