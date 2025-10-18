<script setup lang="ts">
import FullFolderStatus from '@/components/setup/FullFolderStatus.vue'
import { ref } from 'vue'
import { scheme } from '@/plugins/vuetify'
import { useSetupStore } from '@/stores/setupStore.ts'

const setupStore = useSetupStore()
const refreshLoading = ref(false)

async function refreshFolderSummary() {
  refreshLoading.value = true
  await setupStore.fetchDiskInfo()
  refreshLoading.value = false
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
  <section v-if="setupStore.disks">
    <!-- Media Folder -->
    <full-folder-status
      :folder="setupStore.disks.media_folder"
      env-var="MEDIA_DIR"
      title-icon="mdi-camera"
    />

    <!-- Thumbnails Folder -->
    <full-folder-status
      :folder="setupStore.disks.thumbnails_folder"
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
</style>
