import { onMounted, onUnmounted, ref } from 'vue'

export function useContainerResize() {
  const container = ref<HTMLElement | null>(null)
  const width = ref(0)
  const height = ref(0)

  onMounted(() => {
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      const { width: w, height: h } = entry.contentRect
      width.value = w
      height.value = h
    })

    if (container.value) {
      observer.observe(container.value)
    }

    onUnmounted(() => {
      if (observer) {
        observer.disconnect()
      }
    })
  })

  return { container, width, height }
}
