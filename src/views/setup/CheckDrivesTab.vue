<script setup lang="ts">
import FullFolderStatus from '@/components/setup/FullFolderStatus.vue'
import { photosApi } from '@/utils/api/PhotosApi'
import { type Ref, ref } from 'vue'
import type { DiskResponse } from '@/utils/types/api'
import { scheme } from '@/plugins/vuetify'

const diskResponse: Ref<DiskResponse | null> = ref(null)
const refreshLoading = ref(false)

async function refreshFolderSummary() {
  refreshLoading.value = true
  const result = await photosApi.getDiskInfo()
  refreshLoading.value = false
  if (!result.ok) {
    console.warn('error getting validate folders result', result)
    return
  }
  console.log(result.value)
  diskResponse.value = result.value
}

refreshFolderSummary().then()
</script>

<template>
  <!-- Folders Status Section -->
  <div class="folder-status-title mb-3">
    <p
      class="text-caption text-medium-emphasis"
      :style="{ color: scheme.on_surface }"
    >
      Make sure the correct drives are linked before starting the indexing
      process.
    </p>
    <v-spacer />
    <v-btn
      :color="scheme.primary"
      variant="plain"
      density="compact"
      @click="refreshFolderSummary"
      :loading="refreshLoading"
      prepend-icon="mdi-refresh"
      >Refresh
    </v-btn>
  </div>
  <section v-if="diskResponse">
    <!-- Media Folder -->
    <full-folder-status
      :folder="diskResponse.media_folder"
      env-var="MEDIA_DIR"
      title-icon="mdi-camera"
    />

    <!-- Thumbnails Folder -->
    <full-folder-status
      :folder="diskResponse.thumbnails_folder"
      env-var="THUMBNAILS_DIR"
      title-icon="mdi-image-multiple"
    />
  </section>

  <v-skeleton-loader
    :loading="refreshLoading"
    v-else
    type="card-avatar, heading, paragraph"
  ></v-skeleton-loader>
</template>

<style scoped>
.folder-status-title {
  display: flex;
  align-items: center;
}

h3 {
  opacity: 0.7;
  font-weight: 500;
  font-size: 20px;
}
</style>
