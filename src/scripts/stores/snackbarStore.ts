import { defineStore } from 'pinia'
import { ref } from 'vue'
import { isAxiosError } from 'axios'

// --- Types ---

export interface SnackAction {
  label: string
  onClick: () => unknown
}

export interface AlertAction {
  name: string
  action: () => unknown
  color?: string
}

export interface CreateAlert {
  title: string
  description: string
  icon?: string
  actions?: AlertAction[]
}

export interface Alert {
  id: string
  title: string
  description: string
  icon?: string
  actions?: AlertAction[]
}

export interface Snack {
  id: string // Changed to string for UUID
  message: string
  color: 'success' | 'info' | 'warning' | 'error' | 'surface-variant' | string
  timeout: number
  action?: SnackAction
  error?: Error
  errorData?: { error: string }
  timerId?: ReturnType<typeof setTimeout>
}

/** Input options when creating a snackbar */
export type SnackOptions = {
  message: string
  color?: Snack['color']
  timeout?: number
  action?: SnackAction
  error?: unknown
}

// --- Store ---

export const useSnackbarsStore = defineStore('snackbars', () => {
  const snackQueue = ref<Snack[]>([])
  const alertQueue = ref<Alert[]>([])

  /**
   * Removes a snackbar by ID.
   */
  function remove(id: string) {
    const index = snackQueue.value.findIndex((s) => s.id === id)
    if (index > -1) {
      clearTimeout(snackQueue.value[index]!.timerId)
      snackQueue.value.splice(index, 1)
    }
  }

  /**
   * Adds a snackbar to the queue.
   */
  function enqueue(options: SnackOptions) {
    const id = crypto.randomUUID() // Robust unique ID
    const defaultTimeout = options.color === 'error' ? 10000 : 5000

    const snack: Snack = {
      id,
      message: options.message,
      color: options.color || 'surface-variant',
      timeout: options.timeout ?? defaultTimeout,
      action: options.action,
    }

    // Process Error objects if present
    if (options.error) {
      if (isAxiosError(options.error)) {
        snack.error = options.error
        snack.errorData = options.error.response?.data
        console.error('[Snack Axios]', options.message, options.error.response?.data)
      } else if (options.error instanceof Error) {
        snack.error = options.error
        console.error('[Snack Error]', options.message, options.error)
      } else {
        snack.error = new Error(String(options.error))
        console.error('[Snack Unknown]', options.message, options.error)
      }
      // Force error styling if not set
      if (!options.color) snack.color = 'error'
    }

    snackQueue.value.push(snack)

    // Start timer
    startTimer(snack)
  }

  function startTimer(snack: Snack) {
    if (snack.timeout > 0) {
      snack.timerId = setTimeout(() => {
        remove(snack.id)
      }, snack.timeout)
    }
  }

  /**
   * Pauses the auto-close timer (e.g., on hover).
   */
  function pauseTimeout(id: string) {
    const snack = snackQueue.value.find((s) => s.id === id)
    if (snack && snack.timerId) {
      clearTimeout(snack.timerId)
      snack.timerId = undefined
    }
  }

  /**
   * Resumes the auto-close timer (e.g., on mouse leave).
   */
  function resumeTimeout(id: string) {
    const snack = snackQueue.value.find((s) => s.id === id)
    if (snack && !snack.timerId) {
      // Give it a bit more time if the user was reading it
      const remaining = Math.max(snack.timeout / 2, 2000)
      snack.timerId = setTimeout(() => {
        remove(snack.id)
      }, remaining)
    }
  }

  // --- Convenience Helpers ---

  function info(message: string, action?: SnackAction) {
    enqueue({ message, color: 'primary', action })
  }

  function success(message: string, action?: SnackAction) {
    enqueue({ message, color: 'success', timeout: 4000, action })
  }

  function warning(message: string, action?: SnackAction) {
    enqueue({ message, color: 'warning', timeout: 6000, action })
  }

  function error(message: string, error?: unknown, action?: SnackAction) {
    enqueue({ message, error, color: 'error', timeout: 10000, action })
  }

  function alert(alert: CreateAlert) {
    const id = crypto.randomUUID()
    alertQueue.value.push({
      id,
      ...alert,
    })
    return id
  }

  function removeAlert(id: string) {
    const index = alertQueue.value.findIndex((a) => a.id === id)
    if (index > -1) {
      alertQueue.value.splice(index, 1)
    }
  }

  return {
    snackQueue,
    alertQueue,
    remove,
    enqueue,
    info,
    success,
    warning,
    error,
    pauseTimeout,
    resumeTimeout,
    alert,
    removeAlert,
  }
})
