import { defineStore } from 'pinia'
import { ref, type Ref, watch } from 'vue'

interface Snack {
  message: string
  open: boolean
  timeout: number
  id: number
}

export const useSnackbarsStore = defineStore('snackbars', () => {
  const queue: Ref<Snack[]> = ref([])

  watch(
    queue,
    () => {
      const removeIndices: number[] = []
      for (let i = 0; i < queue.value.length; i++) {
        if (!queue.value[i].open) {
          removeIndices.push(i)
        }
      }
      setTimeout(() => {
        for (const index of removeIndices) {
          queue.value.splice(index, 1)
        }
      }, 200)
    },
    { deep: true },
  )

  function message(m: string) {
    return enqueue({
      message: m,
      timeout: 10000,
    })
  }

  function enqueue({
    message,
    timeout = 5000,
  }: {
    message: string
    timeout: number
  }): void {
    queue.value.push({
      id: Math.round(Math.random() * 1000000),
      message,
      open: true,
      timeout,
    })
  }

  return {
    queue,
    message,
    enqueue,
  }
})
