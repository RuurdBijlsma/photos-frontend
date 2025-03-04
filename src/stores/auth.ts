// src/stores/auth.ts
import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type {
  User,
  LoginCredentials,
  RegisterData,
  AuthError,
} from '@/types/auth'

export const useAuthStore = defineStore(
  'auth',
  () => {
    const user = ref<User | null>(null)
    const token = ref<string | null>(null)
    const error = ref<AuthError | null>(null)
    const loadingCount = ref(0)
    const isLoading = computed(() => loadingCount.value === 0)
    const isLoggedIn = computed(() => !!user.value)

    /**
     * Login with email and password
     */
    async function login(credentials: LoginCredentials) {}

    /**
     * Register new user with validation
     */
    async function register(userData: RegisterData) {}

    /**
     * Fetch current authenticated user
     */
    async function fetchCurrentUser() {}

    /**
     * Initiate password reset
     */
    async function forgotPassword(email: string) {}

    /**
     * Reset password with token
     */
    async function resetPassword(forgotToken: string, newPassword: string) {}

    /**
     * Verify email with token
     */
    async function verifyEmail(verification_token: string) {}

    /**
     * Logout current user
     */
    function logout() {
      user.value = null
      token.value = null
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
