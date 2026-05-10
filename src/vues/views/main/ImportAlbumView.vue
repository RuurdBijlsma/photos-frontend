<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import albumService from '@/scripts/services/albumService.ts'
import type { AlbumSummary } from '@/scripts/types/api/album.ts'
import { useAuthStore } from '@/scripts/stores/authStore.ts'
import { useSnackbarsStore } from '@/scripts/stores/snackbarStore.ts'
import { useDialogStore } from '@/scripts/stores/dialogStore.ts'
import { useAlbumStore } from '@/scripts/stores/albumStore.ts'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const snackbars = useSnackbarsStore()
const dialogs = useDialogStore()
const albumStore = useAlbumStore()

const token = computed(() => route.params.token as string)
const summary = ref<AlbumSummary | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const importing = ref(false)

// Form fields for local import
const localName = ref('')
const localDescription = ref('')

async function fetchSummary() {
  if (!token.value) return
  loading.value = true
  error.value = null
  try {
    const { data } = await albumService.checkInvite({ token: token.value })
    summary.value = data
    localName.value = data.name
    localDescription.value = data.description || ''
  } catch (e: any) {
    console.error('Failed to check invite', e)
    if (e.response?.status === 401 || e.response?.status === 404) {
      error.value = 'This invitation has expired or is invalid.'
    } else {
      error.value = 'Failed to load album preview. Please try again later.'
    }
  } finally {
    loading.value = false
  }
}

async function startImport() {
  if (!token.value) return
  importing.value = true
  try {
    const { data: newAlbum } = await albumService.acceptInvite({
      token: token.value,
      name: localName.value,
      description: localDescription.value,
    })
    
    // Refresh user albums so it shows up in the list
    await albumStore.fetchUserAlbums()
    
    snackbars.success('Import started! Photos will appear shortly.')
    
    // Redirect to the new album with a flag to show the importing banner
    await router.push({
      name: 'album-view',
      params: { albumId: newAlbum.id },
      query: { importing: 'true' }
    })
  } catch (e) {
    snackbars.error('Failed to start import', e)
    importing.value = false
  }
}

onMounted(() => {
  fetchSummary()
})
</script>

<template>
  <div class="import-page">
    <div class="content-wrapper">
      <v-card class="import-card" elevation="12" rounded="xl" :loading="loading">
        <template v-if="loading">
          <div class="loading-state">
            <v-progress-circular indeterminate color="primary" size="64" />
            <p>Fetching album details...</p>
          </div>
        </template>

        <template v-else-if="error">
          <div class="error-state">
            <v-icon icon="mdi-alert-circle-outline" color="error" size="80" />
            <h2>Oops!</h2>
            <p>{{ error }}</p>
            <v-btn color="primary" variant="tonal" rounded="xl" class="mt-4" to="/">
              Go Home
            </v-btn>
          </div>
        </template>


        <template v-else-if="summary">
          <div class="preview-header">
            <v-icon icon="mdi-share-variant-outline" color="primary" size="32" class="mb-2" />
            <h1>Album Invitation</h1>
            <p class="subtitle">You've been invited to import an album</p>
          </div>

          <v-divider class="my-6" />

          <div class="album-details">
            <div class="album-info-card">
              <v-icon icon="mdi-image-multiple" class="mr-4" color="primary" />
              <div class="info-text">
                <h3>{{ summary.name }}</h3>
                <p>{{ summary.relativePaths.length }} photos</p>
              </div>
            </div>

            <p v-if="summary.description" class="preview-description">
              "{{ summary.description }}"
            </p>

            <v-divider class="my-6" />
              <div class="import-form">
                <v-text-field
                  v-model="localName"
                  label="Album Name"
                  variant="outlined"
                  rounded="lg"
                  prepend-inner-icon="mdi-pencil"
                  hide-details
                  class="mb-4"
                />
                <v-textarea
                  v-model="localDescription"
                  label="Description (Optional)"
                  variant="outlined"
                  rounded="lg"
                  prepend-inner-icon="mdi-text"
                  rows="2"
                  auto-grow
                  hide-details
                />
              </div>

              <v-btn
                color="primary"
                size="x-large"
                block
                rounded="xl"
                class="mt-8 import-btn"
                :loading="importing"
                @click="startImport"
              >
                Import to My Library
              </v-btn>
            </div>
          </template>
        </v-card>
    </div>
  </div>
</template>

<style scoped>
.import-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  padding: 20px;
}

.content-wrapper {
  width: 100%;
  max-width: 500px;
}

.import-card {
  padding: 40px;
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.loading-state, .error-state {
  text-align: center;
  padding: 40px 0;
}

.loading-state p {
  margin-top: 20px;
  opacity: 0.7;
}

.preview-header {
  text-align: center;
}

.preview-header h1 {
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 4px;
}

.subtitle {
  opacity: 0.6;
  font-size: 16px;
}

.album-info-card {
  display: flex;
  align-items: center;
  background: rgba(var(--v-theme-primary), 0.1);
  padding: 20px;
  border-radius: 20px;
  margin-bottom: 20px;
}

.info-text h3 {
  font-size: 20px;
  font-weight: 600;
  margin: 0;
}

.info-text p {
  margin: 0;
  opacity: 0.7;
  font-size: 14px;
}

.preview-description {
  font-style: italic;
  opacity: 0.8;
  text-align: center;
  margin-bottom: 20px;
  padding: 0 10px;
}

.import-btn {
  font-weight: 600;
  letter-spacing: 0.5px;
  box-shadow: 0 4px 15px rgba(var(--v-theme-primary), 0.3);
}

.logged-out-state p {
  font-size: 14px;
  opacity: 0.8;
}
</style>
