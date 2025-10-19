import { defineStore } from 'pinia'
import { ref, type Ref, watch } from 'vue'

/**
 * Interface representing a single snackbar notification.
 */
export interface Snack {
  id: number
  message: string
  open: boolean
  timeout: number
  color?: 'success' | 'info' | 'warning' | 'error' | string
  error?: Error | null
}

/**
 * Options for creating a new snackbar.
 * All properties except 'message' are optional.
 */
export type SnackOptions = Omit<Partial<Snack>, 'id' | 'open'> & {
  message: string
}

export const useSnackbarsStore = defineStore('snackbars', () => {
  /**
   * The reactive array of snackbar objects currently managed by the store.
   * This is the queue that the UI component will render.
   */
  const queue: Ref<Snack[]> = ref([])

  /**
   * This watcher is the key to automatically cleaning up the queue.
   * When a snackbar's `open` property is set to `false` (by Vuetify's v-model),
   * this detects the change and removes the item from the queue after a short
   * delay. The delay allows Vuetify's fade-out animation to complete smoothly.
   */
  watch(
    queue,
    () => {
      // Find the first snackbar that is marked as closed.
      const closedSnackIndex = queue.value.findIndex((snack) => !snack.open)

      // If a closed snackbar is found, remove it after a delay.
      if (closedSnackIndex > -1) {
        setTimeout(() => {
          queue.value.splice(closedSnackIndex, 1)
        }, 300) // 300ms is a safe delay for most animations
      }
    },
    { deep: true },
  )

  /**
   * The core function for adding a new snackbar to the queue.
   * @param options The snackbar configuration.
   */
  function enqueue(options: SnackOptions): void {
    const defaults: Omit<Snack, 'id' | 'message'> = {
      open: true,
      timeout: 10000,
      color: 'info',
    }

    queue.value.push({
      ...defaults,
      ...options,
      id: Math.random() * 1000000, // Simple unique ID
    })
  }

  /**
   * A shortcut to enqueue a standard informational message.
   * @param message The text to display.
   */
  function info(message: string): void {
    enqueue({ message, color: 'info' })
  }

  /**
   * A shortcut to enqueue a success message.
   * @param message The text to display.
   */
  function success(message: string): void {
    enqueue({ message, color: 'success', timeout: 5000 })
  }

  /**
   * A shortcut to enqueue an error message.
   * @param message The text to display.
   */
  function warn(message: string): void {
    enqueue({ message, color: 'warning', timeout: 7500 })
  }

  /**
   * A shortcut to enqueue an error message.
   * @param message The text to display.
   * @param error Optional error object
   */
  function error(message: string, error: unknown | null = null): void {
    if (error instanceof Error) {
      console.error('Message: ', message, error.message, error)
      enqueue({ message, color: 'error', timeout: 15000, error })
    } else if (error === null) {
      enqueue({ message, color: 'error', timeout: 1500000 })
    } else {
      console.warn('Logged error not shown because the error type is not error', message, error)
    }
  }

  /**
   * A shortcut to enqueue an error message.
   * @param message The text to display.
   */
  function message(message: string): void {
    enqueue({ message, color: 'surface-variant' })
  }

  /**
   * Pauses the timeout for a specific snackbar.
   * @param snackId The ID of the snackbar to pause.
   */
  function pauseTimeout(snackId: number): void {
    const snack = queue.value.find((s) => s.id === snackId)
    if (snack) {
      snack.timeout = -1
    }
  }

  return {
    // State
    queue,
    // Actions
    enqueue,
    message,
    info,
    success,
    error,
    warn,
    pauseTimeout,
  }
})
