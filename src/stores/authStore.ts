import { computed, ref, type Ref, watch } from 'vue'
import { defineStore } from 'pinia'
import authService from '@/script/services/authService'
import type { CreateUser, LoginUser, User, Tokens } from '@/script/types/api/auth'
import { useSnackbarsStore } from '@/stores/snackbarStore.ts'
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
  // A new state property to track if the initial auth check is complete.
  const isInitialized: Ref<boolean> = ref(false)
  const snackbarStore = useSnackbarsStore()
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
   */
  async function refreshTokens(): Promise<Tokens> {
    if (!refreshToken.value) {
      await logout()
      throw new Error("No refresh token available.")
    }
    try {
      const response = await authService.refreshSession({ refreshToken: refreshToken.value })
      const { accessToken: newAccessToken, refreshToken: newRefreshToken, expiry: newExpiry } = response.data
      setTokens(newAccessToken, newRefreshToken, newExpiry)
      return response.data
    } catch (error) {
      await logout()
      throw error
    }
  }

  /**
   * Fetches the current user's data using the access token.
   */
  async function fetchCurrentUser() {
    if (!accessToken.value) return
    try {
      const response = await authService.getMe()
      user.value = response.data
    } catch (error) {
      user.value = null
      throw error
    }
  }

  /**
   * Initializes the auth state on app startup. Checks for an existing session,
   * validates the token, and refreshes it if necessary.
   */
  async function initialize() {
    if (isInitialized.value) return

    if (!refreshToken.value) {
      isInitialized.value = true
      return
    }

    try {
      // Check if the token is expired or nearing expiry (e.g., within 60 seconds)
      const buffer = 60 * 1000; // 60-second buffer
      if (!expiry.value || (expiry.value * 1000) - buffer < Date.now()) {
        await refreshTokens()
      }

      // If we have a valid token but no user data in the store, fetch it.
      if (accessToken.value && !user.value) {
        await fetchCurrentUser()
      }

    } catch (error) {
      // refreshTokens() already handles logout on failure.
      console.error('App initialization failed:', error)
    } finally {
      isInitialized.value = true
    }
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
      if (error instanceof Error) snackbarStore.error('Failed to login. ' + error.message, error)
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

    user.value = null
    accessToken.value = null
    refreshToken.value = null
    expiry.value = null

    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('expiry')
    localStorage.removeItem('authUser')

    // Using `window.location` can be more reliable for ensuring a clean state after logout.
    router.push({ name: 'login' }) // Replace with your login route name
  }

  // --- RETURN ---
  return {
    user,
    accessToken,
    refreshToken,
    status,
    isAuthenticated,
    isAdmin,
    isInitialized,
    register,
    login,
    logout,
    fetchCurrentUser,
    refreshTokens,
    initialize,
  }
})
