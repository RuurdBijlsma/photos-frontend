import { BaseApi } from '../api/BaseApi'
import type {
  ApiError,
  DiskResponse,
  UnsupportedFilesResponse,
  LoginCredentials,
  LoginResponse,
  MediaSampleResponse,
  RegisterData,
  RegisterResponse,
} from '../types/api'
import { Err, Ok, type Result } from '@/utils/types/result'

export class PhotosApi extends BaseApi {
  async login(
    credentials: LoginCredentials,
  ): Promise<Result<LoginResponse, ApiError>> {
    return this.json<LoginResponse>({
      method: 'POST',
      path: '/api/auth/login',
      body: credentials,
    })
  }

  async register(
    userData: RegisterData,
  ): Promise<Result<RegisterResponse, ApiError>> {
    return this.json<RegisterResponse>({
      method: 'POST',
      path: '/api/auth/register',
      body: userData,
    })
  }

  async getFolders(
    fromFolder: string = '',
  ): Promise<Result<string[], ApiError>> {
    return this.json<string[]>({
      method: 'GET',
      path: `/api/setup/folders?folder=${fromFolder}`,
      authenticate: true,
    })
  }

  async getDiskInfo(): Promise<Result<DiskResponse, ApiError>> {
    return this.json<DiskResponse>({
      method: 'GET',
      path: '/api/setup/disk-info',
      authenticate: true,
    })
  }

  async getMediaSample(
    userFolder: string,
  ): Promise<Result<MediaSampleResponse, ApiError>> {
    const path = `/api/setup/media-sample?folder=${encodeURIComponent(userFolder)}`
    return this.json<MediaSampleResponse>({
      method: 'GET',
      path,
      authenticate: true,
    })
  }

  async getUnsupportedFiles(
    userFolder: string,
  ): Promise<Result<UnsupportedFilesResponse, ApiError>> {
    const path = `/api/setup/unsupported-files?folder=${encodeURIComponent(userFolder)}`
    return this.json<UnsupportedFilesResponse>({
      method: 'GET',
      path,
      authenticate: true,
    })
  }

  async setupNeeded(): Promise<Result<boolean, ApiError>> {
    return this.json<boolean>({
      method: 'GET',
      path: '/api/setup/needed',
    })
  }

  async makeFolder(
    baseFolder: string,
    newName: string,
  ): Promise<Result<Response, ApiError>> {
    return this.request({
      method: 'POST',
      path: `/api/setup/folders`,
      authenticate: true,
      body: {
        base_folder: baseFolder,
        new_name: newName,
      },
    })
  }

  async rawMediaUrl(relativePath: string): Promise<Result<string, ApiError>> {
    const result = await this.request({
      method: 'GET',
      path: `/download/media?path=${encodeURIComponent(relativePath)}`,
      authenticate: true,
    })
    if (!result.ok) return result
    try {
      return Ok(URL.createObjectURL(await result.value.blob()))
    } catch (e) {
      console.error(`Can't create blob url from response`, e, {
        apiCall: 'rawMediaUrl',
        relativePath,
      })
      return Err({
        tokenProvided: true,
        serverReachable: true,
        aborted: false,
        error: {
          // @ts-expect-error idk
          message: `Can't create blob url from response. ${e.message}`,
          status: 0,
          statusText: '',
        },
      })
    }
  }
}

export const photosApi = new PhotosApi()
