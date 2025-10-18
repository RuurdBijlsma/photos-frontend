<template>
  <div class="blurred-background">
    <div class="blur-filter"></div>
    <div
      class="background-image"
      :style="{
        backgroundImage: `url(${dynamicBgUrl})`,
      }"
    ></div>
  </div>
  <v-app class="main-content">
    <RouterView />
  </v-app>

  <snackbar-queue />
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router'
import { ref } from 'vue'
import SnackbarQueue from '@/components/SnackbarQueue.vue'
import { usePhotosStore } from '@/stores/photosStore.ts'
import photosService from '@/script/services/photosService.ts'
import { useThemeStore } from '@/stores/themeStore.ts'
import { useTheme } from 'vuetify/framework'

const photosStore = usePhotosStore()
const themeStore = useThemeStore()
const vuetifyTheme = useTheme()

const defaultImage = 'img/etna.jpg'
const dynamicBgUrl = ref(
  localStorage.getItem('backgroundUrl') === null
    ? defaultImage
    : localStorage.getItem('backgroundUrl'),
)

const applyRandomPhoto = async () => {
  if (photosStore.randomPhoto?.media_id) {
    const newBgUrl = photosService.getPhotoThumbnail(photosStore.randomPhoto.media_id, 1080)
    localStorage.setItem('backgroundUrl', newBgUrl)
  }
  if (photosStore.randomPhoto?.themes) {
    const newTheme = photosStore.randomPhoto.themes[0]
    if (newTheme !== undefined) {
      themeStore.setThemesFromJson(newTheme)
      vuetifyTheme.themes.value.dark = themeStore.currentTheme.dark
      vuetifyTheme.themes.value.light = themeStore.currentTheme.light
      // todo uncomment this when dark theme works
      vuetifyTheme.change('light')
    }
  }
}

const loadBg = async () => {
  photosStore.refreshRandomPhoto().then(() => applyRandomPhoto())
}

applyRandomPhoto()
loadBg().then()
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
  backdrop-filter: saturate(150%) brightness(70%) blur(10px) contrast(100%);
  z-index: 1;
}
</style>
