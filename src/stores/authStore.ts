import { computed, ref, type Ref } from 'vue'
import { defineStore } from 'pinia'
import authService from '@/script/services/authService'
import type { CreateUser, LoginUser, User } from '@/script/types/api/auth'
import { useSnackbarsStore } from '@/stores/snackbarStore.ts'

// The 'status' type can be defined for clarity
type AuthStatus = 'idle' | 'loading' | 'error' | 'success'

export const useAuthStore = defineStore('auth', () => {
  // --- STATE ---
  // All state properties are now refs
  const user: Ref<User | null> = ref(null)
  const accessToken: Ref<string | null> = ref(localStorage.getItem('accessToken') || null)
  const refreshToken: Ref<string | null> = ref(localStorage.getItem('refreshToken') || null)
  const status: Ref<AuthStatus> = ref('idle')
  const snackbarStore = useSnackbarsStore()

  // --- GETTERS ---
  const isAuthenticated = computed(() => !!accessToken.value && !!user.value)
  const isAdmin = computed(() => user.value?.role === 'admin')

  // --- ACTIONS ---
  // Actions are regular functions defined within the setup scope

  /**
   * Internal helper function to manage token state and persistence.
   */
  function setTokens(newAccessToken: string, newRefreshToken: string) {
    accessToken.value = newAccessToken
    refreshToken.value = newRefreshToken
    localStorage.setItem('accessToken', newAccessToken)
    localStorage.setItem('refreshToken', newRefreshToken)
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
   * Logs the user in, fetches tokens, and gets user data.
   */
  async function login(credentials: LoginUser) {
    status.value = 'loading'
    try {
      const response = await authService.login(credentials)
      setTokens(response.data.accessToken, response.data.refreshToken)

      await fetchCurrentUser()

      status.value = 'success'
    } catch (error) {
      if (error instanceof Error) snackbarStore.error('Failed to login. ' + error.message, error)
      status.value = 'error'
      // Propagate the error to the component for UI feedback (e.g., showing a snackbar)
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
      await login(credentials)
      status.value = 'success'
      return response.data
    } catch (error) {
      status.value = 'error'
      throw error
    }
  }

  /**
   * Logs the user out, clears all auth state, and redirects to the login page.
   */
  async function logout() {
    // Call the backend to invalidate the refresh token if it exists.
    if (refreshToken.value) {
      try {
        await authService.logout({ refreshToken: refreshToken.value })
      } catch (err) {
        console.warn('Logout API call failed, but logging out client-side anyway.', err)
      }
    }

    // Clear all local state
    user.value = null
    accessToken.value = null
    refreshToken.value = null
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('setup-needed')
  }

  // --- RETURN ---
  // Expose state, getters, and actions
  return {
    // State
    user,
    accessToken,
    refreshToken,
    status,
    // Getters
    isAuthenticated,
    isAdmin,
    // Actions
    register,
    login,
    logout,
    fetchCurrentUser,
    setTokens,
  }
})
