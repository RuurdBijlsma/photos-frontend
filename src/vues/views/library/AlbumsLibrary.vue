<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import MainLayoutContainer from '@/vues/components/MainLayoutContainer.vue'
import GlowImage from '@/vues/components/ui/GlowImage.vue'
import mediaItemService from '@/scripts/services/mediaItemService.ts'
import type { AlbumSortField, AlbumWithCount, SortDirection } from '@/scripts/types/api/album'
import albumService from '@/scripts/services/albumService.ts'
import { useSnackbarsStore } from '@/scripts/stores/snackbarStore.ts'
import { useRouter } from 'vue-router'

const snackbarStore = useSnackbarsStore()
const router = useRouter()
const loading = ref(false)

// Sorting State
const currentSortField = ref<AlbumSortField>(
  localStorage.getItem('albumLibrarySortField') === null
    ? 'latestPhoto'
    : localStorage.albumLibrarySortField,
)
const currentSortDirection = ref<SortDirection>(
  localStorage.getItem('albumLibrarySortDirection') === null
    ? 'desc'
    : localStorage.albumLibrarySortDirection,
)
watch(currentSortField, () => (localStorage.albumLibrarySortField = currentSortField.value))
watch(
  currentSortDirection,
  () => (localStorage.albumLibrarySortDirection = currentSortDirection.value),
)
const userAlbums = ref<AlbumWithCount[]>([])

const sortOptions = [
  {
    title: 'Most recent content',
    field: 'latestPhoto',
    direction: 'desc',
    icon: 'mdi-sort-calendar-descending',
  },
  {
    title: 'Oldest content',
    field: 'latestPhoto',
    direction: 'asc',
    icon: 'mdi-sort-calendar-ascending',
  },
  {
    title: 'Name (A-Z)',
    field: 'name',
    direction: 'asc',
    icon: 'mdi-sort-alphabetical-ascending-variant',
  },
  {
    title: 'Name (Z-A)',
    field: 'name',
    direction: 'desc',
    icon: 'mdi-sort-alphabetical-descending-variant',
  },
  {
    title: 'Recently Updated',
    field: 'updatedAt',
    direction: 'desc',
    icon: 'mdi-sort-clock-descending-outline',
  },
  {
    title: 'Oldest Updated',
    field: 'updatedAt',
    direction: 'asc',
    icon: 'mdi-sort-clock-ascending-outline',
  },
]

async function loadAlbums() {
  loading.value = true
  try {
    const { data } = await albumService.getUserAlbums(
      currentSortField.value,
      currentSortDirection.value,
    )
    console.log(data)
    userAlbums.value = data
  } catch (e) {
    snackbarStore.error('Could not fetch albums', e)
  } finally {
    loading.value = false
  }
}

function handleSort(field: AlbumSortField, direction: SortDirection) {
  console.log('handlesort', field, direction)
  currentSortField.value = field
  currentSortDirection.value = direction
  loadAlbums()
}

function makeNewAlbum() {
  snackbarStore.alert({
    title: 'Create album',
    description: 'Create an album by selecting some photos and clicking "Add to album"',
    icon: 'mdi-image-album',
    actions: [
      {
        name: 'Go to photos',
        color: 'primary',
        action: () => {
          router.push({ path: '/' })
        },
      },
    ],
  })
}

onMounted(() => {
  loadAlbums()
})
</script>

<template>
  <main-layout-container>
    <div class="library-container">
      <header class="library-header">
        <div class="header-left">
          <h1>Albums</h1>
          <span class="album-count">{{ userAlbums.length }} albums</span>
        </div>

        <div class="header-actions">
          <!-- Sort Menu -->
          <v-menu location="bottom end">
            <template v-slot:activator="{ props }">
              <v-btn
                v-bind="props"
                variant="tonal"
                rounded
                prepend-icon="mdi-sort"
                class="text-none"
              >
                {{ sortOptions.find((o) => o.field === currentSortField)?.title }}
              </v-btn>
            </template>
            <v-list density="compact">
              <v-list-item
                v-for="(option, index) in sortOptions"
                :key="index"
                :prepend-icon="option.icon"
                :title="option.title"
                :active="
                  currentSortField === option.field && currentSortDirection === option.direction
                "
                @click="
                  handleSort(option.field as AlbumSortField, option.direction as SortDirection)
                "
              />
            </v-list>
          </v-menu>

          <v-btn
            color="primary"
            prepend-icon="mdi-plus"
            rounded
            variant="flat"
            class="text-none ml-3"
            @click="makeNewAlbum"
          >
            New Album
          </v-btn>
        </div>
      </header>

      <!-- Grid Layout -->
      <div v-if="loading" class="album-grid">
        <div v-for="i in 9" :key="i" class="album-card-skeleton">
          <v-skeleton-loader
            type="card"
            elevation="1"
            color="surface-container-low"
            height="265"
            width="200"
            class="rounded-xl"
          />
        </div>
      </div>

      <div v-else class="album-grid">
        <router-link
          v-for="album in userAlbums"
          :key="album.id"
          :to="`/album/${album.id}`"
          class="album-card"
        >
          <glow-image
            :src="mediaItemService.getPhotoThumbnail(album.thumbnailId, 720, false)"
            :height="200"
            :width="200"
            border-radius="20px"
            :strength="0.7"
          />

          <div class="album-info">
            <h3
              v-tooltip="{
                location: 'top',
                text: album.name || 'Untitled Album',
                disabled: album.name.length <= 19,
              }"
              class="album-name text-truncate"
            >
              {{ album.name || 'Untitled Album' }}
            </h3>
            <p class="album-meta">{{ album.mediaCount ?? 0 }} items</p>
          </div>
        </router-link>
      </div>

      <!-- Empty State -->
      <div v-if="!loading && userAlbums.length === 0" class="empty-state">
        <v-icon icon="mdi-image-album" size="100" class="mb-4 opacity-20" />
        <h2>No albums yet</h2>
        <p>Create your first album to start organizing your memories.</p>
        <v-btn color="primary" variant="tonal" rounded class="mt-6" @click="makeNewAlbum">
          Create Album
        </v-btn>
      </div>
    </div>
  </main-layout-container>
</template>

<style scoped>
.library-container {
  padding: 20px 20px;
}

.library-header {
  padding: 0 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}

.header-left h1 {
  font-size: 2.5rem;
  font-weight: 600;
  line-height: 1.2;
}

.album-count {
  font-size: 0.9rem;
  opacity: 0.6;
  font-weight: 400;
}

.album-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 30px;
  justify-items: center;
}

.album-card {
  text-decoration: none;
  color: inherit;
  transition: transform 0.2s ease;
}

.album-card:hover {
  transform: translateY(-5px) scale(1.05);
}

.image-wrapper {
  position: relative;
  overflow: hidden;
  border-radius: 20px;
}

.album-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.album-card:hover .album-overlay {
  opacity: 1;
}

.album-info {
  margin-top: 12px;
  padding: 0 4px;
}

.album-name {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 2px;
  max-width: 195px;
}

.album-meta {
  font-size: 0.85rem;
  opacity: 0.6;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100px 0;
  text-align: center;
}

.empty-state h2 {
  opacity: 0.8;
}

.empty-state p {
  opacity: 0.6;
}

/* Custom shadow/glow effect on hover similar to GlowImage's logic */
.album-card:hover :deep(.glow-image-container) {
  box-shadow: 0 10px 30px -10px rgba(var(--v-theme-primary), 0.3);
}
</style>
