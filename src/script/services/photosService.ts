import type { AxiosResponse } from 'axios'
import apiClient from './api'
import type { RandomPhotoResponse } from '@/script/types/api/photos.ts'

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
}

export default photosService
