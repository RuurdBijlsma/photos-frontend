<script setup lang="ts">
import { RouterView } from 'vue-router'
</script>

<template>
  <div class="main-content">
    <RouterView />
  </div>
</template>

<style scoped>
.main-content {
  width: 100%;
  height: 100vh;
  overflow-y: auto;
  background-color: #ffe9d7;
  user-select: none;
}
</style>
