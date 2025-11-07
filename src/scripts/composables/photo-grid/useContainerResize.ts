import { ref, onMounted, onUnmounted } from 'vue'

export function useContainerResize() {
  const container = ref<HTMLElement | null>(null)
  const width = ref(0)
  const height = ref(0)

  function updateSize() {
    if (!container.value) return
    const box = container.value.getBoundingClientRect()
    width.value = box.width
    height.value = box.height
  }

  onMounted(() => {
    window.addEventListener('resize', updateSize)
    requestIdleCallback(updateSize)
  })
  onUnmounted(() => window.removeEventListener('resize', updateSize))

  return { container, width, height, updateSize }
}
