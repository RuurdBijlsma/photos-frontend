<template>
  <div class="images">
    <mock-u-i></mock-u-i>
  </div>
</template>
<script setup lang="ts">
import MockUI from '@/components/mock-ui/MockUI.vue'

const now = performance.now()
// const response = await fetch('http://localhost:9475/images/')
// const images = await response.json()
// console.log(images, performance.now() - now)
</script>
