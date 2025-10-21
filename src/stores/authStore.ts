import { computed, ref, type Ref } from 'vue'
import { defineStore } from 'pinia'
import authService from '@/script/services/authService'
import type { CreateUser, LoginUser, User } from '@/script/types/api/auth'
import { isAxiosError } from 'axios'
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
      snackbarStore.error('Failed to fetch current user from server.', error)
    }
  }

  /**
   * Logs the user in, fetches tokens, and gets user data.
   */
  async function login(credentials: LoginUser) {
    status.value = 'loading'
    const snackbarsStore = useSnackbarsStore()
    try {
      const response = await authService.login(credentials)
      setTokens(response.data.access_token, response.data.refresh_token)

      await fetchCurrentUser()

      status.value = 'success'
    } catch (error) {
      if (error instanceof Error) snackbarStore.error('Failed to login. ' + error.message, error)
      status.value = 'error'
      // 3. Extract a user-friendly message and show the snackbar
      let errorMessage = 'An unexpected error occurred.'
      if (isAxiosError(error) && error.response) {
        // Use the error message from the backend if it exists, otherwise a default
        errorMessage =
          error.response.data?.error ?? `Error ${error.response.status}: Login failed.`
      }

      snackbarsStore.error(errorMessage)
      // Propagate the error to the component for UI feedback (e.g., showing a snackbar)
      throw error
    }
  }

  /**
   * Registers the user, and then logs in.
   */
  async function register(credentials: CreateUser): Promise<User> {
    status.value = 'loading'
    const snackbarsStore = useSnackbarsStore()
    try {
      const response = await authService.register(credentials)
      await login(credentials)
      status.value = 'success'
      return response.data
    } catch (error) {
      status.value = 'error'
      // 3. Extract a user-friendly message and show the snackbar
      let errorMessage = 'An unexpected error occurred.'
      if (isAxiosError(error) && error.response) {
        // Use the error message from the backend if it exists, otherwise a default
        errorMessage =
          error.response.data?.error ?? `Error ${error.response.status}: Register failed.`
      }

      snackbarsStore.error(errorMessage, error)
      // Propagate the error to the component for UI feedback (e.g., showing a snackbar)
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
        await authService.logout({ refresh_token: refreshToken.value })
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
