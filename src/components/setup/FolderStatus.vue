<template>
  <div>
    <div class="d-flex justify-space-between mb-2 disk-text-container mt-3">
      <span class="text-caption disk-uppercase">{{ envVar }}</span>
      <span class="text-caption black-text"
        >{{ prettyBytes(info.disk_used) }} /
        {{ prettyBytes(info.disk_total) }}</span
      >
    </div>
    <v-progress-linear
      :model-value="(info.disk_used / info.disk_total) * 100"
      class="linear-progress mt-0"
      color="black"
      rounded
    />

    <div class="chips">
      <v-chip
        variant="tonal"
        density="compact"
        :color="info.read_access ? 'success' : 'error'"
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
        :color="info.write_access ? 'success' : 'error'"
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

<script setup lang="ts">
import type { PathInfoResponse } from '@/utils/api/types'
import { prettyBytes } from '@/utils/formatting'

defineProps<{
  info: PathInfoResponse
  envVar: string
}>()

</script>
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
