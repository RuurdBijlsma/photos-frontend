<script setup lang="ts">
import UnsupportedFiles from '@/components/setup/UnsupportedFiles.vue'
import InaccessibleEntries from '@/components/setup/InaccessibleEntries.vue'
import { usePickFolderStore } from '@/stores/pickFolder'
import ShowSelectedFolder from '@/components/setup/ShowSelectedFolder.vue'
import { scheme } from '@/plugins/vuetify'

const folders = usePickFolderStore()
</script>

<template>
  <v-card variant="text" color="primary" class="top-bar mb-5">
    <show-selected-folder
      :icon-color="scheme.on_surface_variant"
      :pill="true"
      :color="scheme.on_surface"
      :folder="folders.viewedFolder"
    />
    <v-spacer />
    <v-btn
      :loading="folders.unsupportedFilesLoading"
      prepend-icon="mdi-refresh"
      rounded
      variant="text"
      @click="folders.refreshUnsupportedFiles"
      color="primary"
      >Refresh
    </v-btn>
  </v-card>

  <div
    v-if="
      folders.unsupportedFiles &&
      (folders.unsupportedFiles.unsupported_count > 0 ||
        folders.unsupportedFiles.inaccessible_entries.length > 0)
    "
  >
    <!-- Unsupported Files -->
    <unsupported-files
      v-if="folders.unsupportedFiles.unsupported_count > 0"
      :summary="folders.unsupportedFiles"
    />

    <!-- Inaccessible Files and Folders -->
    <inaccessible-entries
      :summary="folders.unsupportedFiles"
      v-if="folders.unsupportedFiles.inaccessible_entries.length > 0"
    />
  </div>
  <v-alert
    variant="flat"
    :color="scheme.primary_container"
    v-else-if="folders.unsupportedFiles"
    class="rounded-xl text-md-caption"
    icon="mdi-check"
  >
    <p :style="{ color: scheme.on_primary_container }">
      Great news! There are no unsupported files in your selection. Everything
      looks good!
    </p>
  </v-alert>
</template>

<style scoped>
.top-bar {
  display: flex;
  align-items: center;
}

.pill {
  padding: 24px 32px;
  border-radius: 32px;
}
</style>
