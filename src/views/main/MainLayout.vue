<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <header class="header">
    <div class="logo">
      <div class="logo-img" />
      <span>Ruurd Photos</span>
    </div>
    <div class="search-bar"></div>
    <div class="header-buttons">
      <v-btn icon>
        <v-icon icon="mdi-face"></v-icon>
      </v-btn>
      <v-btn icon>
        <v-icon icon="mdi-face"></v-icon>
      </v-btn>
    </div>
  </header>
  <div class="layout-body">
    <nav class="left-nav">
      <RouterLink to="/">Home</RouterLink>
      <RouterLink to="/explore">Explore</RouterLink>
      <RouterLink to="/map">Map</RouterLink>
    </nav>

    <div class="router-view-container">
      <RouterView class="router-view" />
    </div>

    <div class="scroll-area"></div>
  </div>
</template>

<style scoped>
.header {
  height: 70px;
  padding: 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.logo {
  display: flex;
  align-items: center;
}

.logo > span {
  font-size: 30px;
  margin-left: 15px;
  font-weight: 500;
  opacity: 0.8;
}

.logo-img {
  height: 50px;
  width: 50px;
  background-image: url('../../assets/logo-512.png');
  background-size: 90%;
  background-position: center;
}

.search-bar {
  height: 50px;
  width: 400px;
  border-radius: 25px;
  background-color: white;
  box-shadow: 0 2px 2px 0 rgba(0, 0, 0, 0.2);
}

.header-buttons {
  display: flex;
  gap: 20px;
}

.layout-body {
  display: flex;
  width: 100%;
  height: calc(100% - 70px);
}

.left-nav {
  width: 200px;
  display: flex;
  flex-direction: column;
}

.router-view-container {
  background: rgb(227, 222, 255);
  background: linear-gradient(
    0deg,
    rgb(234, 222, 255) 0%,
    rgb(255, 248, 252) 100%
  );
  flex-grow: 1;
  border-top-left-radius: 40px;
  border-top-right-radius: 40px;
  overflow: hidden;
  box-shadow: 0 10px 20px 0 rgba(0, 0, 0, 0.1);
  max-width: calc(100% - 250px);
}

.router-view {
  overflow-y: auto;
  height: 100%;
  width: 100%;
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.router-view::-webkit-scrollbar {
  display: none;
}

.scroll-area {
  width: 50px;
}
</style>
