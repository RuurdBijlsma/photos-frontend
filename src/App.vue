<template>
  <div class="blurred-background">
    <div class="blur-filter"></div>
    <div
      class="background-image"
      :style="{
        backgroundImage: `url(http://localhost:9475/thumbnails/${bgId}/200p.avif)`,
      }"
    ></div>
  </div>
  <v-app class="main-content">
    <RouterView />
  </v-app>
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router'
import { ref } from 'vue'

const defaultImage = ''
const bgId = ref(
  localStorage.getItem('backgroundImage') === null
    ? defaultImage
    : localStorage.backgroundImage,
)

const loadBg = async () => {
  const now = performance.now()
  localStorage.backgroundImage = await (
    await fetch('http://localhost:9475/images/random')
  ).json()
  if (bgId.value === defaultImage) {
    bgId.value = localStorage.backgroundImage
  }
  console.log(bgId.value, performance.now() - now)
}
loadBg().then()
</script>

<style scoped>
.main-content {
  width: 100%;
  height: 100vh;
  overflow-y: auto;
  background-color: #fff2e9;
  user-select: none;
}

.blurred-background {
  position: fixed;
  width: 100%;
  height: 100%;
  background-color: blue;
  z-index: 0;
}

.blurred-background > div {
  position: fixed;
  width: 100%;
  height: 100%;
}

.background-image {
  z-index: 0;
  background-size: cover;
  background-position: center;
}

.blur-filter {
  background-color: rgba(255, 255, 255, 0.8);
  backdrop-filter: saturate(120%) brightness(120%) blur(100px) contrast(200%);
  z-index: 1;
}
</style>
