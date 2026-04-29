import { defineStore } from 'pinia'
import { ref } from 'vue'

export type DialogType = 'alert' | 'confirm' | 'prompt'

export interface DialogOptions {
  title: string
  description?: string
  icon?: string
  confirmText?: string
  cancelText?: string
  defaultValue?: string // Only for prompt
  persistent?: boolean
  color?: string
}

interface DialogRequest {
  id: string
  type: DialogType
  options: DialogOptions
  resolve: (value: any) => void
}

export const useDialogStore = defineStore('dialog', () => {
  const queue = ref<DialogRequest[]>([])
  const current = ref<DialogRequest | null>(null)
  const visible = ref(false)
  const inputValue = ref('')

  function processQueue() {
    if (visible.value || queue.value.length === 0) return

    current.value = queue.value[0]
    inputValue.value = current.value.options.defaultValue ?? ''
    visible.value = true
  }

  // --- Public API ---

  function alert(options: DialogOptions | string): Promise<void> {
    const opts = typeof options === 'string' ? { title: options } : options
    return new Promise((resolve) => {
      queue.value.push({ id: crypto.randomUUID(), type: 'alert', options: opts, resolve })
      processQueue()
    })
  }

  function confirm(options: DialogOptions | string): Promise<boolean> {
    const opts = typeof options === 'string' ? { title: options } : options
    return new Promise((resolve) => {
      queue.value.push({ id: crypto.randomUUID(), type: 'confirm', options: opts, resolve })
      processQueue()
    })
  }

  function prompt(options: DialogOptions | string): Promise<string | null> {
    const opts = typeof options === 'string' ? { title: options } : options
    return new Promise((resolve) => {
      queue.value.push({ id: crypto.randomUUID(), type: 'prompt', options: opts, resolve })
      processQueue()
    })
  }

  // --- Internal Handlers ---

  function handleConfirm() {
    if (!current.value) return
    const result = current.value.type === 'prompt' ? inputValue.value : true
    current.value.resolve(result)
    close()
  }

  function handleCancel() {
    if (!current.value) return
    const result = current.value.type === 'confirm' ? false : null
    current.value.resolve(result)
    close()
  }

  function close() {
    visible.value = false
    // Delay removal slightly to allow Vuetify transition to finish
    setTimeout(() => {
      queue.value.shift()
      current.value = null
      inputValue.value = ''
      processQueue()
    }, 200)
  }

  return {
    visible,
    inputValue,
    current,
    alert,
    confirm,
    prompt,
    handleConfirm,
    handleCancel,
  }
})
