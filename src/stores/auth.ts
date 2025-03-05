// src/stores/auth.ts
import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { AuthError, User } from '@/utils/api/types'

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
     * Logout current user
     */
    function logout() {
      user.value = null
      token.value = null
    }

    async function fetchCurrentUser() {}

    return {
      user,
      token,
      error,
      isLoading,
      isLoggedIn,
      logout,
      fetchCurrentUser,
    }
  },
  {
    persist: {
      pick: ['token'],
      storage: localStorage,
    },
  },
)
