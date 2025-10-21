import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '@/stores/authStore'
import authService from './authService'
import { useSnackbarsStore } from '@/stores/snackbarStore.ts'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:9475',
  headers: {
    'Content-Type': 'application/json',
  },
})

// --- Request Interceptor ---
// This injects the access token into every outgoing request
apiClient.interceptors.request.use(
  (config) => {
    // We must import the store inside the function to avoid circular dependency issues
    const authStore = useAuthStore()
    const token = authStore.accessToken

    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error: AxiosError) => Promise.reject(error),
)

// --- Response Interceptor ---
// This is where the magic happens for handling expired tokens.
let isRefreshing = false
let failedQueue: {
  resolve: (value: string) => void
  reject: (reason: Error) => void
}[] = []

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error)
    } else if (token) {
      prom.resolve(token)
    }
  })
  failedQueue = []
}

apiClient.interceptors.response.use(
  (response) => response, // Simply return a successful response
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean
    }
    const snackbarStore = useSnackbarsStore()
    const authStore = useAuthStore()

    // Check for 401 Unauthorized and ensure it's not a retry request
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // If a refresh is already in progress, queue this request
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers['Authorization'] = 'Bearer ' + token
            }
            return apiClient(originalRequest)
          })
          .catch((err) => {
            return Promise.reject(err)
          })
      }

      originalRequest._retry = true
      isRefreshing = true

      const refreshToken = authStore.refreshToken
      if (!refreshToken) {
        console.warn('No refresh token available. Logging out.')
        authStore.logout().then(() => console.info('Logged out'))
        return Promise.reject(error)
      }

      try {
        const response = await authService.refreshSession({
          refresh_token: refreshToken,
        })
        const { access_token, refresh_token } = response.data

        // Update the store with the new tokens
        authStore.setTokens(access_token, refresh_token)

        // Update the header of the original request
        if (originalRequest.headers) {
          originalRequest.headers['Authorization'] = `Bearer ${access_token}`
        }

        // Process the queue with the new token
        processQueue(null, access_token)

        // Retry the original request
        return apiClient(originalRequest)
      } catch (refreshError) {
        snackbarStore.error('Refreshing token failed. Logging out.', refreshError as Error)
        processQueue(refreshError as Error, null)
        authStore.logout()
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  },
)

export default apiClient
