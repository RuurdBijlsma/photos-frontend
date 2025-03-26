<script setup lang="ts">
import { prettyBytes } from '@/utils/formatting'
import { scheme } from '@/plugins/vuetify'
import type { PathInfoResponse } from '@/utils/types/api'

defineProps<{
  info: PathInfoResponse
  envVar: string
}>()
</script>

<template>
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
        >{{ prettyBytes(info.disk_used) }} /
        {{ prettyBytes(info.disk_total) }}</span
      >
    </div>
    <v-progress-linear
      :model-value="(info.disk_used / info.disk_total) * 100"
      class="linear-progress mt-0"
      :color="scheme.primary"
      rounded
    />

    <div class="chips">
      <v-chip
        variant="tonal"
        density="compact"
        :color="info.read_access ? scheme.primary : 'error'"
      >
        <v-icon
          class="mr-2"
          :icon="info.read_access ? 'mdi-check' : 'mdi-close'"
        ></v-icon>
        Read
      </v-chip>
      <v-chip
        variant="tonal"
        density="compact"
        :color="info.write_access ? scheme.primary : 'error'"
      >
        <v-icon
          class="mr-2"
          :icon="info.write_access ? 'mdi-check' : 'mdi-close'"
        ></v-icon>
        Write
      </v-chip>
    </div>
  </div>
</template>

<style scoped>
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
