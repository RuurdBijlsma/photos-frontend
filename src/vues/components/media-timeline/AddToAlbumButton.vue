<script setup lang="ts">
import { computed, ref } from 'vue'
import { useAlbumStore } from '@/scripts/stores/albumStore.ts'
import photoService from '@/scripts/services/photoService.ts'
import albumService from '@/scripts/services/albumService.ts'
import { useRouter } from 'vue-router'
import { useSnackbarsStore } from '@/scripts/stores/snackbarStore.ts'
import ItemsPreview from '@/vues/components/media-timeline/ItemsPreview.vue'

const props = defineProps<{
  idsToAdd: string[]
}>()
const albumStore = useAlbumStore()
const router = useRouter()
const snackbarStore = useSnackbarsStore()

const shownAlbums = computed(() => albumStore.userAlbums.filter((a) => a.name !== ''))
const show = ref(false)

async function createNew() {
  if (props.idsToAdd.length === 0) {
    return snackbarStore.warn("Can't create album with no items in it.")
  }
  const { data: album } = await albumService.createAlbum({
    name: '',
    description: null,
    isPublic: false,
    mediaItemIds: props.idsToAdd,
  })
  await router.push({ path: '/album/' + album.id, query: { create: '1' } })
}
</script>

<template>
  <v-menu v-model="show" :close-on-content-click="false" location="top center" :offset="[25, 0]">
    <template v-slot:activator="{ props }">
      <v-btn
        v-bind="props"
        :icon="show ? 'mdi-chevron-up' : 'mdi-plus'"
        variant="plain"
        density="compact"
        :disabled="show"
        v-tooltip:top="'Add to album'"
      />
    </template>

    <v-card color="surface-container-low" min-width="300" flat class="album-picker rounded-xl pa-3">
      <v-card-title class="text-center mb-2 title-text">Add to album</v-card-title>
      <items-preview :media-item-ids="idsToAdd" />
      <v-list class="mt-3 albums-list" v-if="shownAlbums.length > 0">
        <v-list-item v-for="album in shownAlbums" :key="album.id">
          <v-list-item-media>
            <v-img :src="photoService.getPhotoThumbnail(album.thumbnailId, 144)"></v-img>
          </v-list-item-media>
          <v-list-item-title>{{ album.name }}</v-list-item-title>
          <v-list-item-subtitle>{{ album.mediaCount }}</v-list-item-subtitle>
        </v-list-item>
      </v-list>
      <v-card-actions class="card-actions">
        <v-btn @click="createNew" rounded class="px-5"
          ><v-icon icon="mdi-plus" class="mr-2"></v-icon> Create new album</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-menu>
</template>

<style scoped>
.album-picker {
  border-radius: 50px;
}

.title-text {
  color: rgb(var(--v-theme-primary));
}

.card-actions {
  display: flex;
  justify-content: center;
}

.albums-list {
  background-color: transparent;
}
</style>
