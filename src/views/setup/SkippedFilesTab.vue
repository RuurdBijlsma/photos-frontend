<script setup lang="ts">
import UnsupportedFiles from '@/components/setup/UnsupportedFiles.vue'
import InaccessibleEntries from '@/components/setup/InaccessibleEntries.vue'
import ShowSelectedFolder from '@/components/setup/ShowSelectedFolder.vue'
import { scheme } from '@/plugins/vuetify'
import { usePickFolderStore } from '@/stores/pickFolderStore.ts'

const pickFolderStore = usePickFolderStore()
</script>

<template>
  <v-card variant="text" color="primary" class="top-bar mb-5">
    <show-selected-folder
      :icon-color="scheme.on_surface_variant"
      :pill="true"
      :color="scheme.on_surface"
      :folder="pickFolderStore.viewedFolder"
    />
    <v-spacer />
    <v-btn
      :loading="pickFolderStore.unsupportedFilesLoading"
      prepend-icon="mdi-refresh"
      rounded
      variant="text"
      @click="pickFolderStore.refreshUnsupportedFiles"
      color="primary"
      >Refresh
    </v-btn>
  </v-card>

  <div
    v-if="
      pickFolderStore.unsupportedFiles &&
      (pickFolderStore.unsupportedFiles.unsupported_count > 0 ||
        pickFolderStore.unsupportedFiles.inaccessible_entries.length > 0)
    "
  >
    <!-- Unsupported Files -->
    <unsupported-files
      v-if="pickFolderStore.unsupportedFiles.unsupported_count > 0"
      :summary="pickFolderStore.unsupportedFiles"
    />

    <!-- Inaccessible Files and Folders -->
    <inaccessible-entries
      :summary="pickFolderStore.unsupportedFiles"
      v-if="pickFolderStore.unsupportedFiles.inaccessible_entries.length > 0"
    />
  </div>
  <v-alert
    variant="flat"
    :color="scheme.primary_container"
    v-else-if="pickFolderStore.unsupportedFiles"
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
