<script setup lang="ts">
import { RouterView } from 'vue-router'
</script>

<template>
  <v-app class="main-content">
    <RouterView />
  </v-app>
</template>

<style scoped>
.main-content {
  width: 100%;
  height: 100vh;
  overflow-y: auto;
  background-color: #fff2e9;
  user-select: none;
}
</style>
