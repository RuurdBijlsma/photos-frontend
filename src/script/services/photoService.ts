import type { AxiosResponse } from 'axios'
import apiClient from './api'
import type { RandomPhotoResponse } from '@/script/types/api/photos.ts'
import { PhotosByMonthResponse, TimelineResponse } from '@/generated/ratios.ts'

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

  async getTimeline(): Promise<TimelineResponse> {
    const response = await apiClient.get('/photos/timeline.pb', {
      responseType: 'arraybuffer',
    })
    const buffer = new Uint8Array(response.data)
    return TimelineResponse.decode(buffer)
  },

  async getMediaByMonths(months: string[]): Promise<PhotosByMonthResponse> {
    const response = await apiClient.get('/photos/by-month.pb', {
      responseType: 'arraybuffer',
      params: {
        months: months.join(','),
      },
    })
    const buffer = new Uint8Array(response.data)
    return PhotosByMonthResponse.decode(buffer)
  },
}

export default photoService
