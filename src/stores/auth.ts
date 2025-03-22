// src/stores/auth.ts
import { ref, computed, watch } from 'vue'
import { defineStore } from 'pinia'
import type { ApiError, User } from '@/utils/api/types'
import { photosApi } from '@/utils/api/PhotosApi'

export const useAuthStore = defineStore(
  'auth',
  () => {
    const user = ref<User | null>(null)
    const token = ref<string | null>(null)
    watch(token, () => token.value && photosApi.setToken(token.value))
    const loginError = ref<ApiError | null>(null)
    const registerError = ref<ApiError | null>(null)
    const isLoggedIn = computed(() => !!user.value)
    const loginLoading = ref<boolean>(false)
    const registerLoading = ref<boolean>(false)
    const hasError = computed(() => loginError.value !== null)

    async function login(email: string, password: string): Promise<boolean> {
      if (loginError.value !== null) loginError.value = null
      loginLoading.value = true
      const result = await photosApi.login({ email, password })
      loginLoading.value = false
      if ('error' in result) {
        console.log('Setting login error to', result)
        loginError.value = result
        return false
      }
      token.value = result.token
      user.value = {
        email: email,
        name: result.name,
        pid: result.pid,
      }
      console.info('Login success')
      return true
    }

    async function register(
      displayName: string,
      email: string,
      password: string,
    ): Promise<boolean> {
      registerLoading.value = true
      if (loginError.value !== null) loginError.value = null
      if (registerError.value !== null) registerError.value = null
      const result = await photosApi.register({
        name: displayName,
        email,
        password,
      })
      if ('error' in result) {
        console.log('Setting register error to', result)
        registerError.value = result
        registerLoading.value = false
        return false
      }
      const loginSuccess = await login(email, password)
      registerLoading.value = false
      if (!loginSuccess) {
        const le = loginError.value as ApiError | null
        registerError.value = {
          error: 'Login failed',
          description: `Login failed after successful registration.
          Login error: ${le?.error} \n\n ${le?.description}`, // noinspection
        }
        return false
      }
      registerError.value = null
      console.info('Register success')
      return true
    }

    async function setupNeeded() {
      if (localStorage.getItem('setupNeeded') === 'false') {
        return false
      }
      const result = await photosApi.setupNeeded()
      localStorage.setupNeeded = result
      return result
    }

    function logout() {
      user.value = null
      token.value = null
    }

    async function fetchCurrentUser() {}

    return {
      user,
      token,
      error: loginError,
      hasError,
      registerLoading,
      loginLoading,
      isLoggedIn,
      registerError,
      register,
      login,
      logout,
      fetchCurrentUser,
      setupNeeded,
    }
  },
  {
    persist: {
      pick: ['token', 'user'],
      storage: localStorage,
    },
  },
)
