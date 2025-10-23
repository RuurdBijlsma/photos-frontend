<!-- SuperLazy.vue -->
<template>
  <div v-intersect="{ handler: onIntersect, options: intersectOptions }" :style="placeholderStyle">
    <slot v-if="isVisible"></slot>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

const props = defineProps({
  width: {
    type: String,
    default: '100%',
  },
  height: {
    type: String,
    required: true,
  },
  // Add a new prop for the margin
  margin: {
    type: String,
    default: '0px', // Default to no margin
  },
})

const isVisible = ref(false)

const placeholderStyle = computed(() => ({
  width: props.width,
  height: props.height,
}))

// Create a computed options object for the v-intersect directive
const intersectOptions = computed(() => ({
  rootMargin: props.margin,
}))

function onIntersect(isIntersecting: boolean) {
  isVisible.value = isIntersecting
}
</script>
