<script setup lang="ts">
import { useBackgroundStore } from '@/scripts/stores/backgroundStore'
import { useSettingStore } from '@/scripts/stores/settingsStore.ts'
import NavDrawer from '@/vues/components/layout/NavDrawer.vue'

// Instantiate stores
const backgroundStore = useBackgroundStore()
const settings = useSettingStore()

// Initialize the stores.
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

  <v-layout>
    <v-app-bar density="comfortable" :height="70" class="header" color="transparent" elevation="0">
      <h1 class="appbar-title"><span>Ruurd</span> Photos</h1>
      <v-spacer />
      <label class="search-bar">
        <span class="search-icon-div">
          <v-icon class="search-icon" icon="mdi-magnify"></v-icon>
        </span>
        <v-text-field
          class="search-text-field"
          placeholder="Search..."
          rounded
          hide-details
          clearable
        />
      </label>
      <v-spacer />
      <div class="header-buttons">
        <v-btn variant="plain" rounded>
          <v-icon icon="mdi-upload"></v-icon>
          Upload
        </v-btn>
        <v-btn icon variant="plain">
          <v-icon icon="mdi-cog"></v-icon>
        </v-btn>
        <v-btn icon>
          <v-avatar>
            <v-img src="img/avatar.jpg"></v-img>
          </v-avatar>
        </v-btn>
      </div>
    </v-app-bar>

    <nav-drawer />

    <v-main class="layout-body">
      <router-view class="router-view" />
    </v-main>
  </v-layout>
</template>

<style scoped>
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
  backdrop-filter: saturate(150%) brightness(70%) blur(25px) contrast(100%);
  z-index: 1;
}

.appbar-title {
  font-weight: 600;
  font-size: 20px;
  margin-left: 50px;
  opacity: 0.8;
}

.appbar-title > span {
  font-weight: 400;
}

.search-bar {
  cursor: text;
  height: 50px;
  width: calc(100% - 800px);
  max-width: 700px;
  border-radius: 25px;
  background-color: rgba(var(--v-theme-surface-container), 0.8);
  display: flex;
  flex-direction: row;
}

.search-bar:has(.search-text-field input:focus) {
  background-color: white;
  color: black;
  box-shadow: 0 2px 2px 0 rgba(0, 0, 0, 0.2);
}

.search-icon-div {
  width: 40px;
  height: 50px;
  display: flex;
  justify-content: flex-end;
  align-items: center;
}

.search-text-field {
  margin-top: -3px;
}

.search-bar:deep(.v-field__overlay) {
  display: none;
}

.search-bar:deep(.v-field__outline) {
  display: none;
}

.header-buttons {
  display: flex;
  gap: 20px;
  align-items: center;
}

.layout-body {
  display: flex;
  width: 100vw;
  height: 100%;
}
</style>
