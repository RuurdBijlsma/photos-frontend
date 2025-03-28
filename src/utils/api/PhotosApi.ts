import type {
  ApiError,
  LoginCredentials,
  LoginResponse,
  RegisterData,
  RegisterResponse,
} from '@/utils/api/types'
import type { DiskResponse, UserFolderResponse } from '@/utils/types/api'

export class PhotosApi {
  private readonly baseUrl: string
  private token?: string

  constructor(baseUrl: string = 'http://localhost:7000', token?: string) {
    this.baseUrl = baseUrl
    this.token = token
  }

  setToken(token: string) {
    this.token = token
  }

  /**
   * Login with email and password
   */
  async login(
    credentials: LoginCredentials,
  ): Promise<ApiError | LoginResponse> {
    const response = await fetch(this.baseUrl + '/api/auth/login', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    })
    if (!response.ok) {
      console.warn('Login failed', response)
      return {
        error: `${response.status.toString()} ${response.statusText}`,
        description: await response.text(),
      }
    }
    return await response.json()
  }

  /**
   * Register new user with validation
   */
  async register(userData: RegisterData): Promise<RegisterResponse | ApiError> {
    const response = await fetch(this.baseUrl + '/api/auth/register', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    })
    if (!response.ok) {
      console.warn('Register failed', response)
      return {
        error: `${response.status.toString()} ${response.statusText}`,
        description: (await response.json())['description'],
      }
    }
    const result = await response.json()
    console.log(result)
    return {
      success: true,
    }
  }

  async getDiskInfo(): Promise<DiskResponse | ApiError> {
    const response = await fetch(this.baseUrl + '/api/setup/disk-info', {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.token}`,
      },
    })
    if (!response.ok) {
      console.warn('call to get disk info failed', response)
    }
    return await response.json()
  }

  async getUserFolderInfo(
    userFolder: string,
  ): Promise<UserFolderResponse | ApiError> {
    const response = await fetch(
      this.baseUrl + `/api/setup/user-folder-info?user_folder=${userFolder}`,
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.token}`,
        },
      },
    )
    if (!response.ok) {
      console.warn('call to get user folder info failed', response)
    }
    return await response.json()
  }

  async setupNeeded(): Promise<boolean> {
    const response = await fetch(this.baseUrl + '/api/auth/setup-needed', {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    })
    if (!response.ok) {
      console.warn('Setup needed check failed', response)
    }
    return await response.json()
  }

  async rawMediaUrl(relativePath: string): Promise<string> {
    const url = `${this.baseUrl}/download/media?path=${encodeURIComponent(relativePath)}`
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.token}`,
      },
    })
    const blob = await response.blob()
    return URL.createObjectURL(blob)
  }
}

export const photosApi = new PhotosApi()
