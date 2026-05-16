<script setup lang="ts">
import { useRoute } from 'vue-router'
import { computed, ref, watch } from 'vue'
import { useAlbumStore } from '@/scripts/stores/albumStore.ts'
import ThumbnailImg from '@/vues/components/ui/ThumbnailImg.vue'
import { useSystemStore } from '@/scripts/stores/systemStore.ts'
import { useEventListener } from '@vueuse/core'

const albumStore = useAlbumStore()
const systemStore = useSystemStore()
const route = useRoute()

const faceIcons = [
  'mdi-face-man',
  'mdi-face-man-outline',
  'mdi-face-man-shimmer',
  'mdi-face-man-shimmer-outline',
  'mdi-face-woman',
  'mdi-face-woman-outline',
  'mdi-face-woman-shimmer',
  'mdi-face-woman-shimmer-outline',
  'mdi-baby-face-outline',
]
const faceIcon = faceIcons[Math.floor(Math.random() * faceIcons.length)]

const albumsExpanded = ref(
  localStorage.getItem('navExpandAlbums') === null ? true : localStorage.navExpandAlbums === 'true',
)
const maxShownAlbums = ref(5)
const collapseDrawer = ref(
  localStorage.getItem('collapseDrawer') === null ? false : localStorage.collapseDrawer === 'true',
)

const userHasAlbums = computed(() => albumStore.userAlbums.length > 0)
const truncatedAlbums = computed(() => albumStore.userAlbums.slice(0, maxShownAlbums.value))
const hasMoreAlbums = computed(() => albumStore.userAlbums.length > maxShownAlbums.value)

let isResizing = false
const COLLAPSE_THRESHOLD = 125
function startResize() {
  isResizing = true
}

requestIdleCallback(() => albumStore.fetchUserAlbums())
useEventListener(document, 'mouseup', (e) => {
  isResizing = false
})
useEventListener(document, 'mousemove', (e) => {
  if (!isResizing) return
  collapseDrawer.value = e.clientX < COLLAPSE_THRESHOLD
})

watch(albumsExpanded, () =>
  localStorage.setItem('navExpandAlbums', JSON.stringify(albumsExpanded.value)),
)
watch(collapseDrawer, () =>
  localStorage.setItem('collapseDrawer', JSON.stringify(collapseDrawer.value)),
)
</script>

<template>
  <v-navigation-drawer
    permanent
    color="transparent"
    floating
    class="drawer-container"
    :width="collapseDrawer ? 60 : 256"
  >
    <v-list color="primary-darken-1" v-if="!collapseDrawer" class="nav-list">
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
          v-if="userHasAlbums"
          :class="{
            'point-down': albumsExpanded,
          }"
          variant="plain"
        ></v-btn>
      </div>

      <v-expand-transition v-if="userHasAlbums">
        <div v-show="albumsExpanded" class="album-list-container">
          <div class="album-list-branch">
            <v-list-item
              :prepend-gap="10"
              rounded
              :to="`/album/${album.id}`"
              v-for="album in truncatedAlbums"
              :key="album.id"
              class="album-sub-item"
              @mouseenter="albumStore.fetchAlbumMedia(album.id)"
            >
              <template v-slot:prepend>
                <v-avatar size="32" rounded color="surface-container-high">
                  <thumbnail-img
                    cover
                    v-if="album.thumbnailId"
                    :media-item-id="album.thumbnailId"
                    :height="144"
                  />
                </v-avatar>
              </template>

              <v-list-item-title
                v-tooltip="{
                  location: 'top',
                  text: album.name,
                  disabled: album.name.length <= 15,
                }"
                v-if="album.name"
              >
                {{ album.name || 'Unnamed' }}
              </v-list-item-title>

              <v-list-item-subtitle style="font-size: 0.7rem">
                {{ album.mediaCount.toLocaleString() }} item{{ album.mediaCount === 1 ? '' : 's' }}
              </v-list-item-subtitle>
            </v-list-item>

            <v-btn
              density="compact"
              variant="plain"
              rounded
              color="secondary"
              v-if="hasMoreAlbums"
              class="show-more-less-button ms-4"
              @click="maxShownAlbums += 5"
              >Show more</v-btn
            >
            <v-btn
              density="compact"
              variant="plain"
              rounded
              color="secondary"
              v-else-if="maxShownAlbums > 5"
              class="show-more-less-button ms-4"
              @click="maxShownAlbums = 5"
              >Show less</v-btn
            >
          </div>
        </div>
      </v-expand-transition>
      <v-list-item
        v-if="systemStore.stats.hasClusteredPeople"
        rounded
        :prepend-icon="faceIcon"
        title="People"
        to="/people"
      />
    </v-list>
    <div v-else class="collapsed-list">
      <v-btn
        icon="mdi-image-outline"
        :variant="route.path === '/' ? 'tonal' : 'plain'"
        :color="route.path === '/' ? 'primary-darken-1' : undefined"
        to="/"
        title="Photos"
        :active="route.path === '/'"
      />
      <v-btn
        icon="mdi-compass-outline"
        :variant="route.path.startsWith('/explore') ? 'tonal' : 'plain'"
        :color="route.path === '/explore' ? 'primary-darken-1' : undefined"
        to="/explore"
        title="Explore"
      />
      <v-btn
        icon="mdi-map-outline"
        :variant="route.path.startsWith('/map') ? 'tonal' : 'plain'"
        :color="route.path === '/map' ? 'primary-darken-1' : undefined"
        to="/map"
        title="Map"
      />
      <v-divider class="ma-2" />
      <v-btn
        icon="mdi-image-album"
        :variant="route.path.startsWith('/albums') ? 'tonal' : 'plain'"
        :color="route.path === '/albums' ? 'primary-darken-1' : undefined"
        to="/albums"
        title="Albums"
      />
      <v-btn
        v-if="systemStore.stats.hasClusteredPeople"
        :icon="faceIcon"
        :variant="route.path.startsWith('/people') ? 'tonal' : 'plain'"
        :color="route.path === '/people' ? 'primary-darken-1' : undefined"
        to="/people"
        title="People"
      />
    </div>
    <div class="resize-handle" @mousedown="startResize"></div>
  </v-navigation-drawer>
</template>

<style scoped>
.drawer-container {
  position: relative;
}

:deep(.v-navigation-drawer) {
  transition: width 150ms !important;
}

.resize-handle {
  position: absolute;
  right: 0;
  top: 0;
  height: 100%;
  width: 6px;
  cursor: e-resize;
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

.albums-nav {
  display: flex;
  align-items: center;
  gap: 5px;
}

.albums-nav-item {
  flex-grow: 1;
}

.album-list-branch {
  margin-left: 20px;
  padding-left: 5px;
  border-left: 1px solid rgba(var(--v-border-color), 0.12);
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.album-sub-item {
  padding-top: 4px;
  padding-bottom: 4px;
}

.show-more-less-button {
  font-size: 11px;
  text-transform: none;
  justify-content: start;
  width: fit-content;
}

.albums-nav-btn {
  transition: transform 0.3s ease-in-out;
}

.point-down {
  transform: rotate(180deg);
}

.collapsed-list {
  padding: 5px;
  padding-top: 20px;
  display: flex;
  flex-direction: column;
  gap: 5px;
}
</style>
