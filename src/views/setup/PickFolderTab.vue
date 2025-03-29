<script setup lang="ts">
import UnsupportedFiles from '@/components/setup/UnsupportedFiles.vue'
import InaccessibleEntries from '@/components/setup/InaccessibleEntries.vue'
import MediaSample from '@/components/setup/MediaSample.vue'
import { photosApi } from '@/utils/api/PhotosApi'
import { type Ref, ref } from 'vue'
import type { UserFolderResponse } from '@/utils/types/api'
import { useAuthStore } from '@/stores/auth'
import FolderPicker from '@/components/setup/FolderPicker.vue'
import { scheme } from '@/plugins/vuetify'

const auth = useAuthStore()

const folderInfo: Ref<UserFolderResponse | null> = ref(null)
const refreshLoading = ref(false)
let N_SAMPLES = 8
const samples: Ref<string[]> = ref(Array(N_SAMPLES))

async function refreshInfo() {
  refreshLoading.value = true
  const result = await photosApi.getUserFolderInfo('./')
  refreshLoading.value = false

  if (!result.ok) {
    console.warn('error getting validate folders result', result)
    return
  }
  console.log(result.value)
  folderInfo.value = result.value

  N_SAMPLES = result.value.samples.length
  let j = 0
  for (let i = 0; i < N_SAMPLES; i++) {
    getImageUrl(result.value.samples[i]).then(
      imageUrl => (samples.value[j++] = imageUrl),
    )
  }
}

async function getImageUrl(file: string): Promise<string> {
  console.log(file)
  const result = await photosApi.rawMediaUrl(file)
  if (result.ok) {
    return result.value
  }
  console.warn("Couldn't get image url", result)
  return 'img/placeholder.svg'
}

refreshInfo().then()
</script>

<template>
  <!-- Folders Status Section -->
  <section v-if="folderInfo">
    <v-card
      class="mb-6 folder-card"
      variant="text"
      rounded
      :color="scheme.primary"
    >
      <v-card-title class="d-flex align-center card-title">
        <v-icon icon="mdi-alert-circle-outline" class="mr-2"></v-icon>
        Pick your user folder.
      </v-card-title>
      <v-card-text>
        <p class="text-medium-emphasis text-caption mb-3">
          Select the media folder where your
          <span :style="{ fontWeight: 700 }">({{ auth.user?.name }})</span>
          files are located. You can choose the root of the linked media
          directory or a specific folder. If you invite others, their media will
          be kept in separate folders.
        </p>
        <folder-picker class="mb-5" />
      </v-card-text>
    </v-card>

    <!-- Media Files Section -->
    <media-sample :summary="folderInfo" :images="samples" class="mt-10" />

    <!-- Unsupported Files -->
    <unsupported-files
      class="mt-10"
      v-if="folderInfo.unsupported_count > 0"
      :summary="folderInfo"
    />

    <!-- Inaccessible Files and Folders -->
    <inaccessible-entries
      :summary="folderInfo"
      v-if="folderInfo.inaccessible_entries.length > 0"
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
