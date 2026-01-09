<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import MainLayoutContainer from '@/vues/components/MainLayoutContainer.vue'

const containerRef = ref<HTMLElement | null>(null)
const virtualScrollHeight = ref(0)

let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  if (!containerRef.value) return

  resizeObserver = new ResizeObserver((entries) => {
    const entry = entries[0]
    if (entry) {
      virtualScrollHeight.value = entry.contentRect.height
    }
  })

  resizeObserver.observe(containerRef.value)
})

onBeforeUnmount(() => {
  if (resizeObserver && containerRef.value) {
    resizeObserver.unobserve(containerRef.value)
    resizeObserver.disconnect()
  }
})
</script>

<template>
  <main-layout-container ref="containerRef">
    <v-virtual-scroll :height="virtualScrollHeight" class="virtual-scroll" />
  </main-layout-container>

  <div class="timeline-scroll"></div>
</template>

<style scoped>
.virtual-scroll {
  background-color: blue;
}

.timeline-scroll {
  width: 50px;
  height: 100%;
  background-color: red;
}
</style>
