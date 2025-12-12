<script setup lang="ts">
import MainLayoutContainer from '@/vues/components/MainLayoutContainer.vue'
import { useRoute } from 'vue-router'
import { useAlbumStore } from '@/scripts/stores/albumStore.ts'
import { computed, ref, watch } from 'vue'
import type { VTextField } from 'vuetify/components'
import photoService from '@/scripts/services/photoService.ts'

const route = useRoute()
const albumStore = useAlbumStore()

const id = computed(() => route.params.id as string)

watch(id, () => albumStore.refreshAlbumDetails(id.value))

const album = computed(() => {
  if (!albumStore.cache.has(id.value)) {
    return null
  }
  return albumStore.cache.get(id.value)!
})
albumStore.refreshAlbumDetails(id.value)

const titleTextField = ref<VTextField | null>(null)
watch(titleTextField, () => {
  if (route.query.hasOwnProperty('create')) {
    console.log('Focus')
    console.log(titleTextField.value)
    if (titleTextField.value) titleTextField.value.focus()
  }
})

const albumTitleInput = ref('')
const showTitleEdit = ref(false)
const titleLoading = ref(false)
// todo extract title component here

function startEditingTitle() {
  albumTitleInput.value = album.value?.name ?? ''
  showTitleEdit.value = true
}

async function setAlbumTitle() {
  showTitleEdit.value = false
  titleLoading.value = true
  try {
    await albumStore.updateAlbumDetails(id.value, { name: albumTitleInput.value })
  } finally {
    titleLoading.value = false
  }
}
</script>

<template>
  <main-layout-container>
    <div class="container">
      <div class="album-view" v-if="album">
        <div class="album-summary">
          <div class="album-preview-pic" v-if="album.thumbnailId">
            <v-img :src="photoService.getPhotoThumbnail(album.thumbnailId, 144)" />
          </div>
          <div class="summary-right">
            <div class="album-title">
              <div class="title-container" v-if="album.name !== '' && !showTitleEdit">
                <h1 class="title-h1" v-if="!titleLoading">{{ album.name }}</h1>
                <v-progress-linear v-else indeterminate />
                <v-btn
                  class="title-edit-button"
                  icon="mdi-pencil-outline"
                  @click="startEditingTitle"
                />
              </div>
              <v-form v-else @submit.prevent="setAlbumTitle" class="change-title-form">
                <v-text-field
                  ref="titleTextField"
                  class="title-text-field"
                  label="Change album title"
                  required
                  variant="outlined"
                  base-color="surface-variant"
                  hide-details
                  rounded
                  v-model="albumTitleInput"
                />
                <v-btn variant="tonal" color="primary" type="submit" icon="mdi-check" />
              </v-form>
            </div>
            <h3 v-if="album.description">{{ album.description }}</h3>
          </div>
        </div>
        <div class="media-grid" v-if="album.mediaItems.length > 0">
          <v-img
            width="500"
            v-for="item in album.mediaItems"
            :key="item.mediaItem.id"
            :src="photoService.getPhotoThumbnail(item.mediaItem.id, 720)"
          />
        </div>
        <div v-else class="no-images-view">
          <v-icon class="no-images-icon" :size="300">mdi-image-album</v-icon>
          <p class="no-images-text">This album is empty!</p>
          <p class="no-images-caption">
            You can add items by selecting them on the
            <router-link to="/">main timeline</router-link> and clicking "Add to album".
          </p>
        </div>
      </div>
      <div v-else-if="albumStore.fetchingAlbumDetails.has(id)">
        <h1>Loading album details...</h1>
        <div class="album-load-spinner">
          <v-progress-circular size="50" />
        </div>
      </div>
      <div v-else>
        <h1>No album found for id {{ id }}</h1>
      </div>
    </div>
  </main-layout-container>
</template>

<style scoped>
.container {
  padding: 15px 30px;
  height: calc(100% - 60px);
}

.album-view {
  height: 100%;
}

.album-summary {
  display: flex;
}

.summary-right {
  flex-grow: 1;
}

.title-container {
  display: flex;
  align-items: center;
  gap: 20px;
  justify-content: space-between;
}

.title-h1 {
  font-size: 50px;
  font-weight: 400;
}

.title-edit-button {
  opacity: 0;
}

.title-container:hover .title-edit-button {
  opacity: 1;
}

.change-title-form {
  display: flex;
  align-items: center;
  gap: 30px;
}

.title-text-field :deep(input) {
  font-size: 40px !important;
}

.media-grid > * {
  display: inline-block;
}

.no-images-view {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
  text-align: center;
  gap: 30px;
  flex-direction: column;
}

.no-images-icon {
  opacity: 0.5;
}

.no-images-text {
  font-size: 30px;
  font-weight: 300;
  opacity: 0.7;
}

.no-images-caption{
  max-width: 480px;
}

.album-load-spinner {
  width: 100%;
  height: 500px;
  display: flex;
  place-items: center;
}
</style>
