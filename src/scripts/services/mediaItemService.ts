import type { AxiosResponse } from 'axios'
import apiClient from './api.ts'
import type { RandomPhotoResponse } from '@/scripts/types/api/photos.ts'
import type { FullMediaItem } from '@/scripts/types/api/fullPhoto.ts'
import type { Theme } from '@/scripts/types/themeColor.ts'
import type { SearchResultItem } from '@/scripts/types/api/search.ts'

const mediaItemService = {
  getPhotoThumbnail(
    id: string | null | undefined,
    size: number,
    onDemand: boolean | undefined,
  ): string {
    if (id === null || id === undefined) return ''
    const baseUrl = apiClient.defaults.baseURL
    const path = onDemand
      ? `/photos/thumbnail/${id}?size=${size}`
      : `/thumbnails/${id}/${size}p.avif`
    return new URL(path, baseUrl).href
  },

  getVideo(id: string | null | undefined, size: number, onDemand: boolean | undefined): string {
    if (id === null || id === undefined) return ''
    const baseUrl = apiClient.defaults.baseURL
    const path = onDemand ? `/photos/video/${id}` : `/thumbnails/${id}/${size}p.webm`
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

  search(
    query: string,
    limit?: number,
  ): Promise<AxiosResponse<SearchResultItem[]>> {
    return apiClient.get<SearchResultItem[]>('/search', {
      params: { query, limit },
    })
  },
}

export default mediaItemService
