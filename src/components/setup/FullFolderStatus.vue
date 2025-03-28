<script setup lang="ts">
import type { PathInfoResponse } from '@/utils/api/types'
import { scheme } from '@/plugins/vuetify'
import { prettyBytes } from '@/utils/formatting'

defineProps<{
  folder: PathInfoResponse
  envVar: string
  titleIcon: string
}>()
</script>

<template>
  <v-card
    class="mb-6 folder-card pa-3"
    variant="flat"
    :color="scheme.secondary_container"
  >
    <v-card-title
      :style="{ color: scheme.on_surface_variant }"
      class="d-flex align-center card-title"
    >
      <v-icon size="22" :icon="titleIcon" class="mr-5"></v-icon>
      {{ folder.folder }}
      <v-spacer />
      <v-chip
        class="ml-2"
        :color="folder.read_access ? scheme.secondary_container : 'error'"
        size="small"
      >
        {{ folder.read_access ? 'Connected' : 'No Access' }}
      </v-chip>
    </v-card-title>
    <v-card-text>
      <div>
        <div class="d-flex justify-space-between mb-2 disk-text-container mt-3">
          <span
            class="text-caption disk-uppercase"
            :style="{ color: scheme.on_surface_variant }"
            >{{ envVar }}
          </span>
          <span
            class="text-caption black-text"
            :style="{ color: scheme.on_surface_variant }"
            >{{ prettyBytes(folder.disk_used) }} /
            {{ prettyBytes(folder.disk_total) }}</span
          >
        </div>
        <v-progress-linear
          :model-value="(folder.disk_used / folder.disk_total) * 100"
          class="linear-progress mt-0"
          :color="scheme.primary"
          rounded
        />

        <div class="chips">
          <v-chip
            variant="tonal"
            density="compact"
            :color="folder.read_access ? scheme.primary : 'error'"
          >
            <v-icon
              class="mr-2"
              :icon="folder.read_access ? 'mdi-check' : 'mdi-close'"
            ></v-icon>
            Read
          </v-chip>
          <v-chip
            variant="tonal"
            density="compact"
            :color="folder.write_access ? scheme.primary : 'error'"
          >
            <v-icon
              class="mr-2"
              :icon="folder.write_access ? 'mdi-check' : 'mdi-close'"
            ></v-icon>
            Write
          </v-chip>
        </div>
      </div>
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
  font-size: 17px;
  font-family: Arial, Helvetica, Roboto, sans-serif;
}

.text-error {
  color: #ff5252;
  font-weight: 500;
}

.folder-card {
  border-radius: 40px;
}

.chips {
  margin-top: 15px;
  display: flex;
  gap: 15px;
}

.linear-progress {
  opacity: 0.7;
}

.disk-uppercase {
  text-transform: uppercase;
  font-weight: bold;
  opacity: 0.7;
}

.black-text {
  color: rgba(0, 0, 0, 0.7);
}
</style>
