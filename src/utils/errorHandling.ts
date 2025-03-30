import { useRouter } from 'vue-router'
import { useSnackbarsStore } from '@/stores/snackbars'
import type { ApiError } from '@/utils/types/api'
import { photosApi } from '@/utils/api/PhotosApi'


const router = useRouter()
const snacks = useSnackbarsStore()

export async function errorNotify(error: ApiError) {
  const { message, redirect } = errorToMessage(error)
  snacks.message(message)
  if (redirect) {
    await router.push(redirect)
  }
}

export function errorToMessage(error: ApiError): {
  message: string
  redirect: string | null
} {
  if (!error.tokenProvided) {
    return {
      message: 'You must be logged in to access this resource.',
      redirect: '/login',
    }
  } else if (!error.serverReachable) {
    return {
      message: `We're having trouble connecting to the server at ${photosApi.baseUrl}. Please try again later.`,
      redirect: null,
    }
  } else if (error.aborted) {
    return {
      message: `The server at ${photosApi.baseUrl} is taking too long to respond. Please check your connection and try again.`,
      redirect: null,
    }
  } else {
    return {
      message: error.error.message,
      redirect: null,
    }
  }
}
