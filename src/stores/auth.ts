// src/stores/auth.ts
import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type {
  User,
  LoginCredentials,
  RegisterData,
  AuthError,
} from '@/types/auth'
import { fetchJson } from '@/utils/apiHelpers'

export const useAuthStore = defineStore(
  'auth',
  () => {
    const user = ref<User | null>(null)
    const token = ref<string | null>(null)
    const error = ref<AuthError | null>(null)
    const isLoading = ref(false)
    const isLoggedIn = computed(() => !!user.value)

    /**
     * A generic wrapper for handling API requests with loading state and error handling
     * @param fn - Async function to execute
     * @returns Promise resolving to the result or undefined if error occurs
     */
    async function handleRequest<T>(
      fn: () => Promise<T>,
    ): Promise<T | undefined> {
      try {
        isLoading.value = true
        error.value = null
        return await fn()
      } catch (err) {
        error.value = {
          message:
            err instanceof Error ? err.message : 'An unexpected error occurred',
        }
      } finally {
        isLoading.value = false
      }
    }

    /**
     * Authenticate a user with email and password
     * @param credentials - Login credentials object
     * @returns Promise resolving to authentication data
     */
    async function login(credentials: LoginCredentials) {
      return handleRequest(async () => {
        const data = await fetchJson<{ token: string }>(
          '/auth/login',
          token.value,
          {
            method: 'POST',
            body: JSON.stringify(credentials),
          },
        )

        token.value = data.token
        await fetchCurrentUser()
        return data
      })
    }

    /**
     * Register a new user account
     * @param userData - User registration data
     * @returns Promise resolving to registration data
     */
    async function register(userData: RegisterData) {
      return handleRequest(async () => {
        const data = await fetchJson<{ token: string }>(
          '/auth/register',
          token.value,
          {
            method: 'POST',
            body: JSON.stringify(userData),
          },
        )

        token.value = data.token
        await fetchCurrentUser()
        return data
      })
    }

    /**
     * Fetch the current authenticated user's data
     * @returns Promise resolving to user data
     */
    async function fetchCurrentUser() {
      return handleRequest(async () => {
        user.value = await fetchJson<User>('/auth/current', token.value)
        return user.value
      })
    }

    /**
     * Send a magic link to the specified email
     * @param email - User's email address
     * @returns Promise resolving to magic link response
     */
    async function sendMagicLink(email: string) {
      return handleRequest(async () => {
        return fetchJson('/auth/magic-link', token.value, {
          method: 'POST',
          body: JSON.stringify({ email }),
        })
      })
    }

    /**
     * Verify a magic link token and authenticate the user
     * @param tokenParam - Magic link token from URL
     * @returns Promise resolving to authentication data
     */
    async function verifyMagicLink(tokenParam: string) {
      return handleRequest(async () => {
        const data = await fetchJson<{ token: string }>(
          `/auth/magic-link/${tokenParam}`,
          token.value,
        )
        token.value = data.token
        await fetchCurrentUser()
        return data
      })
    }

    /**
     * Initiate password reset process
     * @param email - User's email address
     * @returns Promise resolving to reset initiation response
     */
    async function forgotPassword(email: string) {
      return handleRequest(async () => {
        return fetchJson('/auth/forgot', token.value, {
          method: 'POST',
          body: JSON.stringify({ email }),
        })
      })
    }

    /**
     * Reset user password with a valid reset token
     * @param tokenParam - Password reset token
     * @param newPassword - New password to set
     * @returns Promise resolving to reset confirmation
     */
    async function resetPassword(tokenParam: string, newPassword: string) {
      return handleRequest(async () => {
        return fetchJson('/auth/reset', token.value, {
          method: 'POST',
          body: JSON.stringify({ token: tokenParam, newPassword }),
        })
      })
    }

    /**
     * Verify user email with a verification token
     * @param tokenParam - Email verification token
     * @returns Promise resolving to verification result
     */
    async function verifyEmail(tokenParam: string) {
      return handleRequest(async () => {
        return fetchJson(`/auth/verify/${tokenParam}`, token.value)
      })
    }

    /**
     * Log out current user and clear authentication state
     */
    function logout() {
      user.value = null
      token.value = null
    }

    // Initialize user if token exists at store creation
    if (token.value) {
      fetchCurrentUser().then()
    }

    return {
      user,
      token,
      error,
      isLoading,
      isLoggedIn,
      login,
      logout,
      fetchCurrentUser,
      register,
      sendMagicLink,
      verifyMagicLink,
      forgotPassword,
      resetPassword,
      verifyEmail,
    }
  },
  {
    persist: {
      pick: ['token'],
      storage: localStorage,
    },
  },
)
