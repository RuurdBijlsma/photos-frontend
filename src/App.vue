<script setup lang="ts">
import { RouterView } from 'vue-router'
import SnackbarQueue from '@/components/SnackbarQueue.vue'
import { useBackgroundStore } from '@/stores/backgroundStore'
import { usePhotoStore } from '@/stores/photoStore.ts'

// Instantiate stores
const backgroundStore = useBackgroundStore()
const photoStore = usePhotoStore()

// Initialize the stores.
photoStore.initialize()
backgroundStore.initialize()
</script>

<template>
  <div class="blurred-background">
    <div class="blur-filter"></div>
    <div
      class="background-image"
      :style="{
        backgroundImage: `url(${backgroundStore.backgroundUrl})`,
      }"
    ></div>
  </div>
  <v-app class="main-content">
    <RouterView />
  </v-app>

  <snackbar-queue />
</template>

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
  background-color: #363654;
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
    rgba(var(--v-theme-background), 0.95) 0%,
    rgba(var(--v-theme-background), 0.4) 100%
  );
  backdrop-filter: saturate(150%) brightness(70%) blur(15px) contrast(100%);
  z-index: 1;
}
</style>
