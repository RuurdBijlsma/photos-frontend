<script setup lang="ts">
import { scheme } from '@/plugins/vuetify'

const hexToRgba = (hex, alpha) => {
  let r, g, b;
  if (hex.startsWith('#')) {
    hex = hex.substring(1);
    if (hex.length === 3) {
      hex = hex.split('').map(char => char + char).join('');
    }
    r = parseInt(hex.substring(0, 2), 16);
    g = parseInt(hex.substring(2, 4), 16);
    b = parseInt(hex.substring(4, 6), 16);
  }
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};
</script>

<template>
  <v-main class="main" :style="{ backgroundColor: scheme.primary_container }">
    <div class="container" :style="{
      background: `linear-gradient(
        0deg,
        ${hexToRgba(scheme.background, 0.7)} 0%,
        ${hexToRgba(scheme.background, 0.9)} 100%
      )`
    }">
      <slot />
    </div>
  </v-main>
</template>

<style scoped>
.main {
  position: fixed;
  width: 100%;
  height: 100%;
  overflow-y: auto;
  display: flex;
  justify-content: center;
  padding: 20px;
}

.container {
  margin: auto 0;
  flex-grow: 0;
  border-radius: 40px;
  overflow: hidden;
  box-shadow: 0 10px 20px 0 rgba(0, 0, 0, 0.1);
  max-width: 800px;
  padding: 40px 60px;
  display: flex;
  flex-direction: column;
}

.container:deep(.v-sheet) {
  background-color: transparent !important;
  box-shadow: none !important;
}

.container:deep(.v-stepper-header) {
  box-shadow: none !important;
}
</style>
