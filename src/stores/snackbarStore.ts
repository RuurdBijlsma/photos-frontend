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
  color?: 'success' | 'info' | 'warning' | 'error' | string // Allow standard colors or custom ones
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
      timeout: 5000,
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
  function message(message: string): void {
    enqueue({ message, color: 'info' })
  }

  /**
   * A shortcut to enqueue a success message.
   * @param message The text to display.
   */
  function success(message: string): void {
    enqueue({ message, color: 'success', timeout: 3000 })
  }

  /**
   * A shortcut to enqueue an error message.
   * @param message The text to display.
   */
  function error(message: string): void {
    enqueue({ message, color: 'error', timeout: 7000 })
  }

  return {
    // State
    queue,
    // Actions
    enqueue,
    message,
    success,
    error,
  }
})
