<script setup lang="ts">

import { usePickFolderStore } from '@/scripts/stores/pickFolderStore.ts'
import { useAuthStore } from '@/scripts/stores/authStore.ts'
import FolderPicker from '@/vues/components/onboarding/FolderPicker.vue'
import ShowSelectedFolder from '@/vues/components/onboarding/ShowSelectedFolder.vue'
import MediaSample from '@/vues/components/onboarding/MediaSample.vue'

const authStore = useAuthStore()
const pickFolderStore = usePickFolderStore()
</script>

<template>
  <section>
    <v-card class="folder-card" variant="text" rounded color="primary">
      <v-card-title class="d-flex align-center card-title">
        <v-icon icon="mdi-folder-outline" class="mr-2"></v-icon>
        Pick your user folder.
      </v-card-title>
      <v-card-text>
        <p class="text-medium-emphasis text-caption mb-3">
          Choose the folder where your
          <span :style="{ fontWeight: 700 }">({{ authStore.user?.name }})</span>
          photos and videos are stored. You can select the root of your linked media directory or a
          specific subfolder. If you invite others, their media will be organized in separate
          folders within the same root directory.
        </p>
        <folder-picker />
      </v-card-text>
      <div class="text-center mt-4 mb-3">
        <show-selected-folder include-selected-text pill :folder="pickFolderStore.viewedFolder" />
      </div>
    </v-card>

    <!-- Media Files Section -->
    <media-sample
      class="mt-3 media-sample"
      :media-samples="pickFolderStore.mediaSamples"
      :images="pickFolderStore.samples"
    />
  </section>
</template>

<style scoped>
.media-sample {
  min-height: 400px;
}
</style>
