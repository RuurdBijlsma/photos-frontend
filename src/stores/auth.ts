// src/stores/auth.ts
import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { AuthError, User } from '@/utils/api/types'
import { PhotosApi } from '@/utils/api/PhotosApi'

const api = new PhotosApi()

export const useAuthStore = defineStore(
  'auth',
  () => {
    const user = ref<User | null>(null)
    const token = ref<string | null>(null)
    const error = ref<AuthError | null>(null)
    const isLoggedIn = computed(() => !!user.value)
    const loginLoading = ref<boolean>(false)
    const hasError = computed(() => error.value !== null)

    async function register(username:string, email:string, password:string) :Promise<boolean> {
      loginLoading.value = true
      const result = await api.register({name:username, email, password})
      loginLoading.value = false
      if('error' in result){
        console.log('Setting error to', result)
        error.value = result
        return false
      }
      error.value = null
      token.value = result.token
      user.value = {
        email: email,
        name: result.name,
        pid: result.pid,
      }
      return true
    }

    async function login(email: string, password: string): Promise<boolean> {
      loginLoading.value = true
      const result = await api.login({ email, password })
      loginLoading.value = false
      if ('error' in result) {
        console.log('Setting error to', result)
        error.value = result
        return false
      }
      error.value = null
      token.value = result.token
      user.value = {
        email: email,
        name: result.name,
        pid: result.pid,
      }
      return true
    }

    function logout() {
      user.value = null
      token.value = null
    }

    async function fetchCurrentUser() {}

    return {
      user,
      token,
      error,
      hasError,
      loginLoading,
      isLoggedIn,
      login,
      logout,
      fetchCurrentUser,
    }
  },
  {
    persist: {
      pick: ['token', 'user'],
      storage: localStorage,
    },
  },
)
