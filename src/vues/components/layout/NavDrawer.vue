<script setup lang="ts">
import { useRoute } from 'vue-router'
import { ref } from 'vue'
import photoService from '@/scripts/services/photoService.ts'

const albumsExpanded = ref(false)
const albums = [
  { name: 'Hiii', thumbId: 'OZ1tIKHlDE' },
  { name: 'This is my album anme', thumbId: 'AGpONfDBXC' },
  { name: 'Vakantie 2020', thumbId: 'EDl3rjCeNA' },
  { name: 'Selecite vakantie 2002', thumbId: 'T76UO41vAg' },
]

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

      <div class="albums-nav">
        <v-list-item class="albums-nav-item" rounded prepend-icon="mdi-image-album" to="/albums">
          <v-list-item-title>Albums</v-list-item-title>
        </v-list-item>
        <v-btn
          @click="albumsExpanded = !albumsExpanded"
          class="albums-nav-btn"
          density="compact"
          icon="mdi-menu-down"
          :class="{
            'point-down': albumsExpanded,
          }"
          variant="plain"
        ></v-btn>
      </div>

      <v-expand-transition>
        <div v-show="albumsExpanded" class="album-list-container">
          <v-list-item
            rounded
            :to="`/album?name=${album.name}`"
            v-for="album in albums"
            :key="album.name"
          >
            <template v-slot:prepend>
              <v-avatar rounded>
                <v-img :src="photoService.getPhotoThumbnail(album.thumbId, 144)"></v-img>
              </v-avatar>
            </template>
            <v-list-item-title>{{ album.name }}</v-list-item-title>
          </v-list-item>
        </div>
      </v-expand-transition>
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
  max-height: 300px;
  overflow-y: auto;
  padding-right: 2px;
}

.albums-nav-btn {
  transition: transform 0.3s ease-in-out;
}

.point-down {
  transform: rotate(180deg);
}
</style>
