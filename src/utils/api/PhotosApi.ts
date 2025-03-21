import type {
  AuthError,
  LoginCredentials,
  LoginResponse,
  RegisterData,
  RegisterResponse,
} from '@/utils/api/types'

export class PhotosApi {
  private readonly baseUrl: string

  constructor(baseUrl: string = 'http://localhost:7000') {
    this.baseUrl = baseUrl
  }

  /**
   * Login with email and password
   */
  async login(
    credentials: LoginCredentials,
  ): Promise<AuthError | LoginResponse> {
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
  async register(
    userData: RegisterData,
  ): Promise<RegisterResponse | AuthError> {
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
        description: (await response.json())["description"],
      }
    }
    const result = await response.json()
    console.log(result)
    return {
      success: true,
    }
  }

  /**
   * Fetch current authenticated user
   */
  async fetchCurrentUser() {}

  /**
   * Initiate password reset
   */
  async forgotPassword(email: string) {}

  /**
   * Reset password with token
   */
  async resetPassword(forgotToken: string, newPassword: string) {}

  /**
   * Verify email with token
   */
  async verifyEmail(verification_token: string) {}

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
