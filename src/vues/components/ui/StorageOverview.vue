<script setup lang="ts">
import { useSystemStore } from '@/scripts/stores/systemStore.ts'
import { prettyBytes } from '@/scripts/utils.ts'
import { computed } from 'vue'

const systemStore = useSystemStore()
const diskStats = computed(() => systemStore.stats.disk)
const usedPercentage = computed(
  () => (diskStats.value.mediaDrive.diskUsed / diskStats.value.mediaDrive.diskTotal) * 100,
)
const thumbsUsedPercentage = computed(
  () => (diskStats.value.thumbnailDrive.diskUsed / diskStats.value.thumbnailDrive.diskTotal) * 100,
)
</script>

<template>
  <div class="storage-container">
    <v-list-item title="Storage" prepend-icon="mdi-cloud-outline" class="mb-4" />
    <div class="storage-info">
      <p v-if="!diskStats.areSameDrive" class="drive-descriptor">Media drive</p>
      <v-progress-linear :model-value="usedPercentage" color="primary" rounded-bar />
      <p class="usage-text">
        {{ prettyBytes(diskStats.mediaDrive.diskUsed, 1) }} of
        {{ prettyBytes(diskStats.mediaDrive.diskTotal, 1) }} used
      </p>
    </div>
    <div class="storage-info" v-if="!diskStats.areSameDrive">
      <p class="drive-descriptor">Thumbnail drive</p>
      <v-progress-linear :model-value="thumbsUsedPercentage" color="primary" rounded-bar />
      <p class="usage-text">
        {{ prettyBytes(diskStats.thumbnailDrive.diskUsed, 1) }} of
        {{ prettyBytes(diskStats.thumbnailDrive.diskTotal, 1) }} used
      </p>
    </div>
  </div>
</template>

<style scoped>
.storage-container {
  margin: 15px;
}

.storage-info {
  padding: 15px;
  padding-bottom: 10px;
  padding-top: 0;
}

.drive-descriptor {
  font-size: 12px;
  opacity: 0.7;
}

.usage-text {
  margin-top: 8px;
  font-size: 14px;
  color: rgb(var(--v-theme-on-surface-variant));
}
</style>
