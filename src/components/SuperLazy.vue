<!-- SuperLazy.vue -->
<template>
  <div v-intersect="{ handler: onIntersect, options: intersectOptions }" :style="placeholderStyle">
    <slot v-if="isVisible"></slot>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

const emit = defineEmits(['isVisible'])
const props = defineProps({
  width: {
    type: String,
    default: '100%',
  },
  height: {
    type: String,
    required: true,
  },
  margin: {
    type: String,
    default: '250px',
  },
})

const isVisible = ref(false)

const placeholderStyle = computed(() => ({
  width: props.width,
  height: props.height,
}))

const intersectOptions = computed(() => ({
  rootMargin: props.margin,
}))

function onIntersect(isIntersecting: boolean) {
  isVisible.value = isIntersecting
  emit('isVisible', isIntersecting)
}
</script>
