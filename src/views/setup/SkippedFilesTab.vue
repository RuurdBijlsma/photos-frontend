<script setup lang="ts">
import UnsupportedFiles from '@/components/setup/UnsupportedFiles.vue'
import InaccessibleEntries from '@/components/setup/InaccessibleEntries.vue'
import { usePickFolderStore } from '@/stores/pickFolder'
import ShowSelectedFolder from '@/components/setup/ShowSelectedFolder.vue'

const folders = usePickFolderStore()
</script>

<template>
  <show-selected-folder :folder="folders.viewedFolder" />

  <div
    v-if="
      folders.folderInfo &&
      (folders.folderInfo.unsupported_count > 0 ||
        folders.folderInfo.inaccessible_entries.length > 0)
    "
  >
    <!-- Unsupported Files -->
    <unsupported-files
      v-if="folders.folderInfo.unsupported_count > 0"
      :summary="folders.folderInfo"
    />

    <!-- Inaccessible Files and Folders -->
    <inaccessible-entries
      :summary="folders.folderInfo"
      v-if="folders.folderInfo.inaccessible_entries.length > 0"
    />
  </div>
  <p v-else-if="folders.folderInfo" class="text-lg-caption text-center">
    There are no unsupported files in `{{ folders.viewedFolder.join('/') }}`,
    hooray!
  </p>
</template>

<style scoped></style>
