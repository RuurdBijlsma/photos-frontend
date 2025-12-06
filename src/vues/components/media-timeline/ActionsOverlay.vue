<script setup lang="ts">
import { useSelectionStore } from '@/scripts/stores/selectionStore.ts'

const selectionStore = useSelectionStore()
const emit = defineEmits<{
  (e: 'deselectAll'): void
}>()
</script>

<template>
  <v-slide-y-reverse-transition>
    <div class="actions-overlay" v-if="selectionStore.selectedIds.length > 1">
      <v-btn
        icon="mdi-close"
        variant="plain"
        density="compact"
        v-tooltip:top="'Deselect all'"
        @click="emit('deselectAll')"
      />
      <div class="select-text">
      <span class="bold-select">{{ selectionStore.selectedIds.length }}</span
      ><span> selected</span>
      </div>
      <v-spacer />
      <v-btn icon="mdi-plus" variant="plain" density="compact" v-tooltip:top="'Add to album'" />
      <v-btn
        icon="mdi-delete-outline"
        variant="plain"
        density="compact"
        v-tooltip:top="'Move to bin'"
      />
      <v-btn
        icon="mdi-dots-horizontal"
        variant="plain"
        density="compact"
        v-tooltip:top="'More options'"
      />
    </div>
  </v-slide-y-reverse-transition>
</template>

<style scoped>
.actions-overlay {
  --width: 400px;
  position: absolute;
  bottom: 30px;
  margin-left: calc(50% - var(--width) / 2);
  width: var(--width);
  height: 70px;
  padding: 10px 20px;
  z-index: 3;
  text-align: left;
  font-weight: 500;
  border-radius: 40px;
  background-color: rgba(var(--v-theme-surface-container-high), 1);
  color: rgba(var(--v-theme-on-surface-container), 1);
  box-shadow:
    0 4px 8px 0 rgba(0, 0, 0, 0.2),
    0 6px 20px 0 rgba(0, 0, 0, 0.19);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.select-text {
}

.bold-select {
  font-weight: 600;
}
</style>
