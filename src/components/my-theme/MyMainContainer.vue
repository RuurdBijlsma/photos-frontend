<script setup lang="ts">
import { scheme } from '@/plugins/vuetify'
</script>

<template>
  <v-main class="main" :style="{ backgroundColor: scheme.primary_container }">
    <div class="container">
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
  background: rgb(227, 222, 255, 0.7);
  background: linear-gradient(
    0deg,
    rgba(255, 232, 232, 0.5) 0%,
    rgb(255, 248, 252, 0.8) 100%
  );
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
