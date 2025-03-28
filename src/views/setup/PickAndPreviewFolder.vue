<script setup lang="ts">
import UnsupportedFiles from '@/components/setup/UnsupportedFiles.vue'
import InaccessibleEntries from '@/components/setup/InaccessibleEntries.vue'
import MediaSample from '@/components/setup/MediaSample.vue'
import { photosApi } from '@/utils/api/PhotosApi'
import { type Ref, ref } from 'vue'
import type { UserFolderResponse } from '@/utils/types/api'
import { scheme } from '@/plugins/vuetify'
import { useAuthStore } from '@/stores/auth'
import FolderPicker from '@/components/setup/FolderPicker.vue'

const auth = useAuthStore()

const folderInfo: Ref<UserFolderResponse | null> = ref(null)
const refreshLoading = ref(false)
let N_SAMPLES = 8
const samples: Ref<string[]> = ref(Array(N_SAMPLES))

async function refreshInfo() {
  refreshLoading.value = true
  try {
    const result = await photosApi.getUserFolderInfo('./')
    if ('error' in result) {
      console.warn('error getting validate folders result', result)
    } else {
      console.log(result)
      folderInfo.value = result
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

refreshInfo().then()
</script>

<template>
  <!-- Folders Status Section -->
  <div class="folder-status-title mb-3">
    <p class="text-medium-emphasis text-caption mb-3">
      Select the media folder where your
      <span :style="{ fontWeight: 700 }">({{ auth.user?.name }})</span>
      files are located. You can choose the root of the linked media directory
      or a specific folder. If you invite others, their media will be kept in
      separate folders.
    </p>
  </div>
  <section v-if="folderInfo">
    <folder-picker class="mb-5" />

    <!-- Media Files Section -->
    <media-sample :summary="folderInfo" :images="samples" />

    <!-- Unsupported Files -->
    <unsupported-files
      v-if="folderInfo.unsupported_count > 0"
      :summary="folderInfo"
    />

    <!-- Inaccessible Files and Folders -->
    <inaccessible-entries
      v-if="folderInfo.inaccessible_entries.length > 0"
      :summary="folderInfo"
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
