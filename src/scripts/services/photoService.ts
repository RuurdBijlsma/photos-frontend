import type { AxiosResponse } from 'axios'
import apiClient from './api.ts'
import type { RandomPhotoResponse } from '@/scripts/types/api/photos.ts'
import type { FullMediaItem } from '@/scripts/types/api/fullPhoto.ts'
import type { Theme } from '@/scripts/types/themeColor.ts'
import {
  TimelineItemsResponse,
  TimelineRatiosResponse,
} from '@/scripts/types/generated/timeline.ts'

const photoService = {
  getPhotoThumbnail(id: string | null | undefined, size: number): string {
    if (id === null || id === undefined) return ''
    const baseUrl = apiClient.defaults.baseURL
    const path = `/thumbnails/${id}/${size}p.avif`
    return new URL(path, baseUrl).href
  },

  getVideo(id: string | null | undefined, size: number): string {
    if (id === null || id === undefined) return ''
    const baseUrl = apiClient.defaults.baseURL
    const path = `/thumbnails/${id}/${size}p.webm`
    return new URL(path, baseUrl).href
  },

  getRandomPhoto(): Promise<AxiosResponse<RandomPhotoResponse>> {
    return apiClient.get<RandomPhotoResponse>('/photos/random')
  },

  getTheme(color: string): Promise<AxiosResponse<Theme>> {
    return apiClient.get<Theme>('/photos/theme', {
      params: { color },
    })
  },

  getMediaItem(id: string): Promise<AxiosResponse<FullMediaItem>> {
    return apiClient.get<FullMediaItem>('/photos/item', {
      params: { id },
    })
  },

  getTimelineIds(): Promise<AxiosResponse<string[]>> {
    return apiClient.get<string[]>('/timeline/ids', { params: { sort: 'desc' } })
  },

  async getTimelineRatios(): Promise<TimelineRatiosResponse> {
    const response = await apiClient.get('/timeline/ratios', {
      params: { sort: 'desc' },
      responseType: 'arraybuffer',
    })
    const buffer = new Uint8Array(response.data)
    return TimelineRatiosResponse.decode(buffer)
  },

  async getMediaByMonths(months: string[]): Promise<TimelineItemsResponse> {
    const response = await apiClient.get('/timeline/by-month', {
      responseType: 'arraybuffer',
      params: {
        sort: 'desc',
        months: months.join(','),
      },
    })
    const buffer = new Uint8Array(response.data)
    return TimelineItemsResponse.decode(buffer)
  },
}

export default photoService
