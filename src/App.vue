<script setup lang="ts">
import { RouterView } from 'vue-router'
import SnackbarQueue from '@/components/SnackbarQueue.vue'
import { useSettingStore } from '@/stores/settingsStore.ts'

const settings = useSettingStore()
</script>

<template>
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
  background-color: #101010 !important;
}
</style>
