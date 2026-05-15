import type { AxiosResponse } from 'axios'
import apiClient from './api.ts'
import type { RandomPhotoResponse } from '@/scripts/types/api/photos.ts'
import type { FullMediaItem } from '@/scripts/types/api/fullPhoto.ts'
import type { Theme } from '@/scripts/types/themeColor.ts'
import type { Album } from '@/scripts/types/api/album.ts'
import type { UpdateMediaItemRequest } from '@/scripts/types/api/mediaItem.ts'

const mediaItemService = {
  update(id: string, payload: UpdateMediaItemRequest) {
    return apiClient.put<Album>(`/photos/${id}/item`, payload)
  },

  getPhotoThumbnail(
    id: string | null | undefined,
    size: number,
    onDemand: boolean | undefined,
  ): string {
    if (id === null || id === undefined) return ''
    const baseUrl = apiClient.defaults.baseURL
    const path = onDemand
      ? `/photos/${id}/thumbnail?size=${size}`
      : `/thumbnails/${id}/${size}p.avif`
    return new URL(path, baseUrl).href
  },

  getVideo(id: string | null | undefined, size: number, onDemand: boolean | undefined): string {
    if (id === null || id === undefined) return ''
    const baseUrl = apiClient.defaults.baseURL
    const path = onDemand ? `/photos/${id}/video` : `/thumbnails/${id}/${size}p.webm`
    return new URL(path, baseUrl).href
  },

  getFaceThumbnail(personId: string | number | null | undefined): string {
    if (personId === null || personId === undefined) return ''
    const baseUrl = apiClient.defaults.baseURL
    const path = `/thumbnails/people/${personId}.webp`
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
    return apiClient.get<FullMediaItem>(`/photos/${id}/item`)
  },

  /**
   * Downloads a full media file from the server as a Blob.
   * @param relative_path The relative path of the media file to download.
   * @returns A promise that resolves to the Axios response containing the file as a Blob.
   */
  downloadMediaFile(relative_path: string): Promise<AxiosResponse<Blob>> {
    return apiClient.get<Blob>('/photos/download', {
      params: { path: relative_path },
      responseType: 'blob',
    })
  },

  downloadMediaFileById(id: string): Promise<AxiosResponse<Blob>> {
    return apiClient.get<Blob>(`/photos/${id}/download`, {
      responseType: 'blob',
    })
  },
}

export default mediaItemService
