import type { AxiosResponse } from 'axios'
import apiClient from './api'
import type {
  PaginatedMediaResponse,
  RandomPhotoResponse,
  TimelineMonthInfo,
} from '@/script/types/api/photos.ts'
import { AllPhotoRatiosResponse } from '@/generated/ratios.ts' // This service handles all API calls related to the initial application setup.

// This service handles all API calls related to the initial application setup.
const photosService = {
  /**
   * Get random photo id from db, and get the themes associated with that photo.
   * @returns A promise that resolves to a RandomPhotoResponse.
   */
  getRandomPhoto(): Promise<AxiosResponse<RandomPhotoResponse>> {
    return apiClient.get<RandomPhotoResponse>('/photos/random')
  },

  getPhotoThumbnail(id: string, size: number): string {
    const baseUrl = apiClient.defaults.baseURL
    const path = `/thumbnails/${id}/${size}p.avif`
    return new URL(path, baseUrl).href
  },

  /**
   * Get a summary of media counts by month and year.
   * @returns A promise that resolves to a TimelineSummary array.
   */
  getTimelineSummary(): Promise<AxiosResponse<TimelineMonthInfo[]>> {
    return apiClient.get<TimelineMonthInfo[]>('/photos/timeline')
  },

  /**
   * Get media items for a given set of months, grouped by day.
   * @param months - An array of "YYYY-MM" strings.
   * @returns A promise that resolves to a PaginatedMediaResponse.
   */
  getMediaByMonth(months: string[]): Promise<AxiosResponse<PaginatedMediaResponse>> {
    return apiClient.get<PaginatedMediaResponse>('/photos/by-month', {
      params: {
        months: months.join(','),
      },
    })
  },

  async getPhotoRatios(): Promise<AllPhotoRatiosResponse> {
    const response = await apiClient.get('/photos/ratios.pb', {
      responseType: 'arraybuffer',
    })
    const buffer = new Uint8Array(response.data)
    return AllPhotoRatiosResponse.decode(buffer)
  },
}

export default photosService
