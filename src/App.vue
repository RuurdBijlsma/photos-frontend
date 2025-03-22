<template>
  <div class="blurred-background">
    <div class="blur-filter"></div>
    <div
      class="background-image"
      :style="{
        backgroundImage: `url(img/etna.jpg)`,
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
import { useAuthStore } from '@/stores/auth'
import router from '@/plugins/router'

const defaultImage = ''
const bgId = ref(
  localStorage.getItem('backgroundImage') === null
    ? defaultImage
    : localStorage.backgroundImage,
)

const loadBg = async () => {
  const now = performance.now()
  // localStorage.backgroundImage = await (
  //   // await fetch('http://localhost:9475/images/random')
  // ).json()
  if (bgId.value === defaultImage) {
    bgId.value = localStorage.backgroundImage
  }
}
loadBg().then()

const auth = useAuthStore()
auth.setupNeeded().then(needed => {
  if (needed) {
    router.push({ name: 'welcome' })
  }
})
</script>

<style scoped>
.main-content {
  width: 100%;
  height: 100vh;
  overflow-y: auto;
  user-select: none;
}

.blurred-background {
  position: fixed;
  width: 100%;
  height: 100%;
  background-color: #7878ff;
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
  width: 100%;
  height: 100%;
}

.blur-filter {
  background-image: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.95) 0%,
    rgba(255, 255, 255, 0.4) 100%
  );
  backdrop-filter: saturate(150%) brightness(70%) blur(0px) contrast(100%);
  z-index: 1;
}
</style>
