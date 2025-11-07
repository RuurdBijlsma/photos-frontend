<script setup lang="ts">
import { RouterView } from 'vue-router'
import SnackbarQueue from '@/components/SnackbarQueue.vue'
import { useBackgroundStore } from '@/stores/backgroundStore'
import { useTimelineStore } from '@/stores/timelineStore.ts'
import { useSettingStore } from '@/stores/settingsStore.ts'

// Instantiate stores
const backgroundStore = useBackgroundStore()
const timelineStore = useTimelineStore()
const settings = useSettingStore()

// Initialize the stores.
timelineStore.initialize()
backgroundStore.initialize()
</script>

<template>
  <div class="blurred-background">
    <div v-if="settings.imageBackground" class="blur-filter"></div>
    <div
      class="background-image"
      :style="{
        backgroundImage: settings.imageBackground ? `url(${backgroundStore.backgroundUrl})` : '',
      }"
    ></div>
  </div>
  <v-app class="main-content" :class="{ 'backdrop-blur': settings.useBackdropBlur }">
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
  background-color: rgb(var(--v-theme-surface-container-high));
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
