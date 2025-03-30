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
      <div class="text-center mt-4">
        <show-selected-folder :folder="folders.viewedFolder" />
        <v-progress-linear
          class="mt-3"
          indeterminate
          v-if="folders.folderInfoLoading"
          rounded
          rounded-bar
          color="primary"
        />
        <div v-else class="mt-3"></div>
      </div>
    </v-card>

    <!-- Media Files Section -->
    <media-sample
      v-if="folders.folderInfo"
      class="mt-3"
      :summary="folders.folderInfo"
      :images="folders.samples"
    />
    <v-skeleton-loader
      :loading="folders.folderInfoLoading"
      v-else
      type="card-avatar, heading, paragraph, card"
    ></v-skeleton-loader>
  </section>
</template>

<style scoped></style>
