<script setup lang="ts"></script>

<template>
  <v-app-bar
    density="comfortable"
    title="Ruurd Photos"
    :height="70"
    class="header"
    color="transparent"
    elevation="0"
  >
    <template v-slot:prepend>
      <v-avatar>
        <v-img src="img/white-border-512.png"></v-img>
      </v-avatar>
    </template>
    <label class="search-bar">
      <span class="search-icon-div">
        <v-icon class="search-icon" icon="mdi-magnify"></v-icon>
      </span>
      <v-text-field
        class="search-text-field"
        placeholder=""
        rounded
        hide-details
        clearable
      />
    </label>
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
        exact
      />
      <v-list-item
        rounded
        prepend-icon="mdi-compass-outline"
        title="Explore"
        to="/explore"
      />
      <v-list-item
        rounded
        prepend-icon="mdi-map-outline"
        title="Map"
        to="/map"
      />
    </v-list>
  </v-navigation-drawer>
  <v-main class="layout-body">
    <div class="router-view-container">
      <RouterView class="router-view" />
    </div>

    <div class="scroll-area"></div>
  </v-main>
</template>

<style scoped>
.search-bar {
  cursor: text;
  height: 50px;
  width: 400px;
  border-radius: 25px;
  background-color: rgba(0, 0, 0, 0.07);
  display: flex;
  flex-direction: row;
}

.search-bar:has(.search-text-field input:focus) {
  background-color: white;
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
