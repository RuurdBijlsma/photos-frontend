import { computed, ref, type Ref, watch } from 'vue'
import { defineStore } from 'pinia'
import authService from '@/scripts/services/authService.ts'
import type { CreateUser, LoginUser, Tokens, User } from '@/scripts/types/api/auth.ts'
import { useRouter } from 'vue-router'

type AuthStatus = 'idle' | 'loading' | 'error' | 'success'

export const useAuthStore = defineStore('auth', () => {
  // --- STATE ---
  const user: Ref<User | null> = ref(
    localStorage.getItem('authUser') === null
      ? null
      : JSON.parse(localStorage.getItem('authUser')!),
  )
  const accessToken: Ref<string | null> = ref(localStorage.getItem('accessToken') || null)
  const refreshToken: Ref<string | null> = ref(localStorage.getItem('refreshToken') || null)
  const expiry: Ref<number | null> = ref(
    localStorage.getItem('expiry') ? Number(localStorage.getItem('expiry')) : null,
  )
  const status: Ref<AuthStatus> = ref('idle')
  const router = useRouter()

  watch(user, (newUser) => {
    if (newUser) {
      localStorage.setItem('authUser', JSON.stringify(newUser))
    } else {
      localStorage.removeItem('authUser')
    }
  })

  // --- GETTERS ---
  const isAuthenticated = computed(() => !!accessToken.value && !!user.value)
  const isAdmin = computed(() => user.value?.role === 'admin')

  // --- ACTIONS ---

  /**
   * Internal helper to manage token state and persistence.
   */
  function setTokens(newAccessToken: string, newRefreshToken: string, newExpiry: number) {
    accessToken.value = newAccessToken
    refreshToken.value = newRefreshToken
    expiry.value = newExpiry

    localStorage.setItem('accessToken', newAccessToken)
    localStorage.setItem('refreshToken', newRefreshToken)
    localStorage.setItem('expiry', newExpiry.toString())
  }

  /**
   * Refreshes the access token using the refresh token.
   * If successful, it updates the tokens in the store and returns them.
   * If it fails, it will trigger a logout and throw an error.
   */
  async function refreshTokens(): Promise<Tokens> {
    if (!refreshToken.value) {
      await logout()
      throw new Error('No refresh token available.')
    }
    try {
      const response = await authService.refreshSession({ refreshToken: refreshToken.value })
      const {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        expiry: newExpiry,
      } = response.data
      setTokens(newAccessToken, newRefreshToken, newExpiry)

      requestIdleCallback(fetchCurrentUser)

      return response.data
    } catch (error) {
      // If refresh fails, log the user out completely
      await logout()
      throw error
    }
  }

  /**
   * Fetches the current user's data using the access token.
   */
  async function fetchCurrentUser() {
    if (!accessToken.value) return
    const response = await authService.getMe()
    user.value = response.data
  }

  /**
   * Logs the user in, fetches tokens, and gets user data.
   */
  async function login(credentials: LoginUser) {
    status.value = 'loading'
    try {
      const response = await authService.login(credentials)
      setTokens(response.data.accessToken, response.data.refreshToken, response.data.expiry)
      await fetchCurrentUser()
      status.value = 'success'
    } catch (error) {
      if (error instanceof Error) console.warn('Failed to login. ' + error.message, error)
      status.value = 'error'
      throw error
    }
  }

  /**
   * Registers the user, and then logs in.
   */
  async function register(credentials: CreateUser): Promise<User> {
    status.value = 'loading'
    try {
      const response = await authService.register(credentials)
      // Log in automatically after successful registration
      await login({ email: credentials.email, password: credentials.password })
      status.value = 'success'
      return response.data
    } catch (error) {
      status.value = 'error'
      throw error
    }
  }

  /**
   * Logs the user out, clears all auth state, and redirects.
   */
  async function logout() {
    if (refreshToken.value) {
      try {
        await authService.logout({ refreshToken: refreshToken.value })
      } catch (err) {
        console.warn('Logout API call failed, but logging out client-side anyway.', err)
      }
    }

    // Reset all state
    user.value = null
    accessToken.value = null
    refreshToken.value = null
    expiry.value = null

    // Clear all related items from localStorage
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('expiry')
    localStorage.removeItem('authUser')

    // Redirect to the login page to ensure the user isn't stuck on a protected route.
    await router.push({ name: 'login' })
  }

  // --- RETURN ---
  return {
    user,
    accessToken,
    refreshToken,
    status,
    isAuthenticated,
    isAdmin,
    register,
    login,
    logout,
    fetchCurrentUser,
    refreshTokens,
  }
})
