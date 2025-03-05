import type {
  AuthError,
  LoginCredentials,
  LoginResult,
  RegisterData,
} from '@/utils/api/types'

export class PhotosApi {
  private baseUrl: string

  constructor(baseUrl: string = 'http://localhost:7000') {
    this.baseUrl = baseUrl
  }

  /**
   * Login with email and password
   */
  async login(credentials: LoginCredentials): Promise<AuthError | LoginResult> {
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
    }
    return await response.json()
  }

  /**
   * Register new user with validation
   */
  async register(userData: RegisterData) {}

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
}
