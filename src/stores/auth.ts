import { ref, computed, watch } from 'vue'
import { defineStore } from 'pinia'
import { photosApi } from '@/utils/api/PhotosApi'
import type { ApiError, ServerError, User } from '@/utils/types/api'
import { useSnackbarsStore } from '@/stores/snackbars'

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
    const snackbars = useSnackbarsStore()

    async function login(email: string, password: string): Promise<boolean> {
      loginError.value = null
      loginLoading.value = true
      const result = await photosApi.login({ email, password })
      loginLoading.value = false
      if (!result.ok) {
        console.log('Setting login error to', result.error)
        loginError.value = result.error
        return false
      }
      token.value = result.value.token
      user.value = {
        email: email,
        name: result.value.name,
        pid: result.value.pid,
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
      loginError.value = null
      registerError.value = null
      const result = await photosApi.register({
        name: displayName,
        email,
        password,
      })
      if (!result.ok) {
        console.log('Setting register error to', result.error)
        registerError.value = result.error
        registerLoading.value = false
        return false
      }
      const loginSuccess = await login(email, password)
      registerLoading.value = false
      if (!loginSuccess) {
        const le = loginError.value as ApiError | null
        let loginServerError: ServerError | null = null
        if (
          le !== null &&
          le.tokenProvided &&
          le.serverReachable &&
          !le.aborted
        ) {
          loginServerError = le.error
        }
        registerError.value = {
          tokenProvided: true,
          aborted: false,
          serverReachable: true,
          error: loginServerError ?? {
            message: `Login failed after successful registration.`,
            status: 0,
            statusText: '',
          },
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
      if (!result.ok) {
        snackbars.enqueue({
          message: "Can't reach server to determine if setup wizard is needed.",
          timeout: -1,
        })
        console.warn(
          "Can't reach server to check if setup is needed.",
          result.error,
        )
        return false
      }
      localStorage.setupNeeded = result.value
      return result.value
    }

    function logout() {
      user.value = null
      token.value = null
    }

    async function fetchCurrentUser() {}

    return {
      user,
      token,
      loginError,
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
