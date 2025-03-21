<template>
  <div class="images">
    <h1>Photos!</h1>
    <h1>Photos!</h1>
    <h1>Photos!</h1>
    <h1>Photos!</h1>
  </div>
</template>
<script setup lang="ts">
const now = performance.now()
const response = await fetch('http://localhost:9475/images/')
const images = await response.json()
console.log(images, performance.now() - now)
</script>
