<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <header>
    <div class="wrapper">
      <p>Main layout nav:</p>
      <nav>
        <RouterLink to="/">Home</RouterLink>
        <RouterLink to="/explore">Explore</RouterLink>
      </nav>
    </div>
  </header>

  <div class="router-view">
    <h2>Router view:</h2>
    <RouterView />
  </div>

</template>

<style scoped>
.router-view {
  background-color: red;
}
</style>
