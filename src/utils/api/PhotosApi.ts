import type {
  ApiError,
  FileCountResponse,
  LoginCredentials,
  LoginResponse,
  RegisterData,
  RegisterResponse,
} from '@/utils/api/types'

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

  async validateFolders(): Promise<FileCountResponse | ApiError> {
    const response = await fetch(this.baseUrl + '/api/setup/validate-folders', {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.token}`,
      },
    })
    if (!response.ok) {
      console.warn('call to validate folders failed', response)
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
}

export const photosApi = new PhotosApi()
