<script setup lang="ts">
import FolderStatus from '@/components/FolderStatus.vue'

import type { PathInfoResponse } from '@/utils/api/types'

defineProps<{
  folder: PathInfoResponse
  envVar: string
  titleIcon: string
}>()
</script>

<template>
  <v-card rounded class="mb-6 folder-card" variant="tonal" color="grey">
    <v-card-title class="d-flex align-center card-title">
      <v-icon :icon="titleIcon" class="mr-4"></v-icon>
      {{ folder.folder }}
      <v-spacer />
      <v-chip
        class="ml-2"
        :color="folder.read_access ? 'grey' : 'error'"
        size="small"
      >
        {{ folder.read_access ? 'Connected' : 'No Access' }}
      </v-chip>
    </v-card-title>
    <v-card-text>
      <folder-status :info="folder" :env-var="envVar" />
      <div
        v-if="!folder.read_access || !folder.write_access"
        class="mt-4 text-error"
      >
        <v-icon icon="mdi-alert" class="mr-3"></v-icon>
        This folder has permission issues. Please check read/write access.
      </div>
    </v-card-text>
  </v-card>
</template>

<style scoped>
.card-title {
  font-weight: 600;
  color: rgba(0, 0, 0, 0.5);
  font-size: 17px;
}

</style>
