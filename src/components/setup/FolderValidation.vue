<script setup lang="ts">
import FullFolderStatus from '@/components/setup/FullFolderStatus.vue'
import UnsupportedFiles from '@/components/setup/UnsupportedFiles.vue'
import InaccessibleEntries from '@/components/setup/InaccessibleEntries.vue'
import MediaSample from '@/components/setup/MediaSample.vue'
import { photosApi } from '@/utils/api/PhotosApi'
import { type Ref, ref } from 'vue'
import type { FileCountResponse } from '@/utils/types/api'
import { scheme } from '@/plugins/vuetify'

const folderSummary: Ref<FileCountResponse | null> = ref(null)
const refreshLoading = ref(false)
let N_SAMPLES = 8
const samples: Ref<string[]> = ref(Array(N_SAMPLES))

async function refreshFolderSummary() {
  refreshLoading.value = true
  try {
    const result = await photosApi.validateFolders()
    if ('error' in result) {
      console.warn('error getting validate folders result', result)
    } else {
      console.log(result)
      folderSummary.value = result
      refreshLoading.value = false

      N_SAMPLES = result.samples.length
      let j = 0
      for (let i = 0; i < N_SAMPLES; i++) {
        getImageUrl(result.samples[i]).then(
          imageUrl => (samples.value[j++] = imageUrl),
        )
      }
    }
  } finally {
    refreshLoading.value = false
  }
}

async function getImageUrl(file: string): Promise<string> {
  console.log(file)
  return await photosApi.rawMediaUrl(file)
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
      Make sure the correct folders are linked before starting the indexing
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
  <section v-if="folderSummary">
    <!-- Media Folder -->
    <full-folder-status
      :folder="folderSummary.media_folder"
      env-var="MEDIA_DIR"
      title-icon="mdi-camera"
    />

    <!-- Thumbnails Folder -->
    <full-folder-status
      :folder="folderSummary.thumbnails_folder"
      env-var="THUMBNAILS_DIR"
      title-icon="mdi-image-multiple"
    />

    <!-- Media Files Section -->
    <media-sample :summary="folderSummary" :images="samples" />

    <!-- Unsupported Files -->
    <unsupported-files
      v-if="folderSummary.unsupported_count > 0"
      :summary="folderSummary"
    />

    <!-- Inaccessible Files and Folders -->
    <inaccessible-entries
      v-if="folderSummary.inaccessible_entries.length > 0"
      :summary="folderSummary"
    />
  </section>

  <v-skeleton-loader
    :loading="refreshLoading"
    v-else
    type="card-avatar, heading, paragraph, divider, heading, button, card, article, card"
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
