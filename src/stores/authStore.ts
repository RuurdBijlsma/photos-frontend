import { computed, ref, type Ref } from 'vue'
import { defineStore } from 'pinia'
import router from '@/plugins/router'
import authService from '@/script/services/authService'
import type { LoginUser, User } from '@/script/types/api/auth'
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

  // --- GETTERS ---
  const isAuthenticated = computed(() => !!accessToken.value && !!user.value)
  const isAdmin = computed(() => user.value?.role === 'ADMIN')

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
      user.value = response.data;
    } catch (error) {
      console.error('Failed to fetch user:', error)
    }
  }

  /**
   * Logs the user in, fetches tokens, and gets user data.
   */
  async function login(credentials: LoginUser) {
    status.value = 'loading'
    const snackbarsStore = useSnackbarsStore();
    try {
      const response = await authService.login(credentials)
      setTokens(response.data.access_token, response.data.refresh_token)

      await fetchCurrentUser()

      status.value = 'success'
      await router.push('/')
    } catch (error) {
      console.error('Failed to login:', error)
      status.value = 'error'
      // 3. Extract a user-friendly message and show the snackbar
      let errorMessage = 'An unexpected error occurred.';
      if (isAxiosError(error) && error.response) {
        // Use the error message from the backend if it exists, otherwise a default
        errorMessage = error.response.data?.message || `Error ${error.response.status}: Login failed.`;
      }

      snackbarsStore.message(errorMessage);
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
        console.error('Logout API call failed, but logging out client-side anyway.', err)
      }
    }

    // Clear all local state
    user.value = null
    accessToken.value = null
    refreshToken.value = null
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('setup-needed');

    // Redirect to login page
    await router.push('/login')
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
    login,
    logout,
    fetchCurrentUser,
    setTokens,
  }
})
