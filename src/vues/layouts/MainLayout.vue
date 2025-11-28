<script setup lang="ts">
import { useBackgroundStore } from '@/scripts/stores/backgroundStore'
import { useTimelineStore } from '@/scripts/stores/timelineStore.ts'
import { useSettingStore } from '@/scripts/stores/settingsStore.ts'
import TimelineScroll from '@/vues/components/photo-grid/TimelineScroll.vue'
import { ref } from 'vue'

// Instantiate stores
const backgroundStore = useBackgroundStore()
const timelineStore = useTimelineStore()
const settings = useSettingStore()
const dateInView = ref<Date | null>(null)

function setDateInView(date: Date) {
  dateInView.value = date
}

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

    <v-navigation-drawer permanent color="transparent" floating>
      <v-list color="primary-darken-1" class="nav-list">
        <v-list-item
          rounded
          prepend-icon="mdi-image-outline"
          title="Photos"
          to="/"
          :active="$route.path === '/'"
        />
        <v-list-item rounded prepend-icon="mdi-compass-outline" title="Explore" to="/explore" />
        <v-list-item rounded prepend-icon="mdi-map-outline" title="Map" to="/map" />
      </v-list>
      <a href="web+burger:cheeseburger">cheeseburger</a>
    </v-navigation-drawer>

    <v-main class="layout-body">
      <div class="router-view-container">
        <router-view class="router-view" @date-in-view="setDateInView" />
      </div>
      <timeline-scroll
        :date-in-view="dateInView"
        :months="timelineStore.timeline"
        class="scroll-area"
      />
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
  backdrop-filter: saturate(150%) brightness(70%) blur(15px) contrast(100%);
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

.nav-list {
  margin-left: 15px;
  margin-right: 15px;
  gap: 5px;
  display: flex;
  flex-direction: column;
}

.nav-list:deep(.v-list-item) {
  border-radius: 40px;
}

.router-view-container {
  background: rgb(227, 222, 255);
  background: linear-gradient(
    0deg,
    rgba(var(--v-theme-background), 0.8) 0%,
    rgba(var(--v-theme-background), 0.9) 100%
  );
  flex-grow: 1;
  border-top-left-radius: 60px;
  border-top-right-radius: 60px;
  overflow: hidden;
  box-shadow: 0 10px 20px 0 rgba(0, 0, 0, 0.1);
  max-width: calc(100% - 50px);
  backdrop-filter: saturate(150%) blur(30px) contrast(100%);
}

.router-view {
  height: calc(100% - 10px);
  width: calc(100% - 20px);
  margin: 10px 10px 0;
  border-radius: 55px 55px 0 0;
  overflow: hidden;
  overflow-y: auto;

  -ms-overflow-style: none;
  scrollbar-width: none;
}

.router-view::-webkit-scrollbar {
  display: none;
}

.scroll-area {
  margin: 15px 0 0;
  width: 50px;
  height: calc(100% - 15px);
  opacity: 0.8;
  transition: opacity 0.2s;
}

.scroll-area:hover {
  opacity: 1;
}
</style>
