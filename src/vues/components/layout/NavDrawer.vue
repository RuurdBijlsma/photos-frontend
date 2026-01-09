<script setup lang="ts">
import { useRoute } from 'vue-router'

const route = useRoute()
</script>

<template>
  <v-navigation-drawer permanent color="transparent" floating>
    <v-list color="primary-darken-1" class="nav-list">
      <v-list-item
        class="mt-3"
        rounded
        prepend-icon="mdi-image-outline"
        title="Photos"
        to="/"
        :active="route.path === '/'"
      />
      <v-list-item rounded prepend-icon="mdi-compass-outline" title="Explore" to="/explore" />
      <v-list-item rounded prepend-icon="mdi-map-outline" title="Map" to="/map" />

      <v-list-subheader class="mt-5">Collections</v-list-subheader>
    </v-list>
    <a href="web+burger:cheeseburger">cheeseburger</a>
  </v-navigation-drawer>
</template>

<style scoped>
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

.albums-nav {
  display: flex;
  align-items: center;
  gap: 5px;
}

.albums-nav-item {
  flex-grow: 1;
}

.album-list-container {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding-right: 2px;
}

.albums-nav-btn {
  transition: transform 0.3s ease-in-out;
}

.point-down {
  transform: rotate(180deg);
}
</style>
