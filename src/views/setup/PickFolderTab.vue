<script setup lang="ts">
import MediaSample from '@/components/setup/MediaSample.vue'
import { useAuthStore } from '@/stores/auth'
import FolderPicker from '@/components/setup/FolderPicker.vue'
import { scheme } from '@/plugins/vuetify'
import { usePickFolderStore } from '@/stores/pickFolder'
import ShowSelectedFolder from '@/components/setup/ShowSelectedFolder.vue'

const auth = useAuthStore()
const folders = usePickFolderStore()
</script>

<template>
  <section>
    <v-card class="folder-card" variant="text" rounded :color="scheme.primary">
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
        <folder-picker />
      </v-card-text>
      <div class="text-center mt-4 mb-3">
        <show-selected-folder
          include-selected-text
          pill
          :folder="folders.viewedFolder"
        />
      </div>
    </v-card>

    <!-- Media Files Section -->
    <media-sample
      v-if="folders.mediaSamples"
      class="mt-3 media-sample"
      :media-samples="folders.mediaSamples"
      :images="folders.samples"
    />
    <v-skeleton-loader
      :loading="folders.mediaSampleLoading"
      v-else
      type="card-avatar, heading, paragraph, card"
    ></v-skeleton-loader>
  </section>
</template>

<style scoped>
.media-sample {
  min-height: 400px;
}
</style>
