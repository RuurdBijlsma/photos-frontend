import type { AxiosResponse } from 'axios'
import apiClient from './api'
import type {
  DiskResponse,
  MakeFolderBody,
  MediaSampleResponse,
  UnsupportedFilesResponse,
} from '@/script/types/api/setup.ts'

// This service handles all API calls related to the initial application setup.
const setupService = {
  /**
   * Check if the initial setup is required (i.e., if any admin user exists).
   * @returns A promise that resolves to a boolean.
   */
  isWelcomeNeeded(): Promise<AxiosResponse<boolean>> {
    return apiClient.get<boolean>('/setup/welcome-needed')
  },

  /**
   * Get information about the configured media and thumbnail disks.
   * @returns A promise that resolves to the disk information.
   */
  getDisks(): Promise<AxiosResponse<DiskResponse>> {
    return apiClient.get<DiskResponse>('/setup/disk-info')
  },

  /**
   * List the subfolders within a given folder.
   * @param folder The base folder to list subdirectories from.
   * @returns A promise that resolves to an array of folder names.
   */
  getFolders(folder: string): Promise<AxiosResponse<string[]>> {
    // For GET requests with query parameters, we use the `params` option
    return apiClient.get<string[]>('/setup/folders', {
      params: { folder },
    })
  },

  /**
   * Create a new folder.
   * @param data An object containing the base folder and the new folder's name.
   * @returns A promise that resolves when the folder is created (204 No Content).
   */
  makeFolder(data: MakeFolderBody): Promise<AxiosResponse<void>> {
    return apiClient.post<void>('/setup/make-folder', data)
  },

  /**
   * Get a sample of media files from a specific folder.
   * @param folder The folder to sample media from.
   * @returns A promise that resolves to the media sample response.
   */
  getMediaSample(folder: string): Promise<AxiosResponse<MediaSampleResponse>> {
    return apiClient.get<MediaSampleResponse>('/setup/media-sample', {
      params: { folder },
    })
  },

  /**
   * Get a list of unsupported files in a specific folder.
   * @param folder The folder to scan for unsupported files.
   * @returns A promise that resolves to the unsupported files response.
   */
  getUnsupportedFiles(folder: string): Promise<AxiosResponse<UnsupportedFilesResponse>> {
    return apiClient.get<UnsupportedFilesResponse>('/setup/unsupported-files', {
      params: { folder },
    })
  },

  /**
   * Downloads a full media file from the server as a Blob.
   * @param relative_path The relative path of the media file to download.
   * @returns A promise that resolves to the Axios response containing the file as a Blob.
   */
  getFullMediaFile(relative_path: string): Promise<AxiosResponse<Blob>> {
    return apiClient.get<Blob>('/download/full-file', {
      params: { path: relative_path },
      responseType: 'blob',
    })
  },
}

export default setupService
