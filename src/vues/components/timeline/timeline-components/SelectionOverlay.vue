<script setup lang="ts">
import AddToAlbumButton from '@/vues/components/timeline/timeline-components/AddToAlbumButton.vue'
import { useSelectionStore } from '@/scripts/stores/timeline/selectionStore.ts'
import type { TimelineContext } from '@/scripts/types/timeline/layout.ts'
import { useAlbumStore } from '@/scripts/stores/albumStore.ts'

withDefaults(
  defineProps<{
    excludeAlbumIds?: string[]
    context?: TimelineContext
  }>(),
  {
    excludeAlbumIds: () => [],
    context: {},
  },
)

const selectionStore = useSelectionStore()
const albumStore = useAlbumStore()
</script>

<template>
  <v-slide-y-reverse-transition>
    <div class="actions-overlay" v-if="selectionStore.selection.size > 0">
      <v-btn
        icon="mdi-close"
        variant="plain"
        density="compact"
        v-tooltip:top="'Deselect all'"
        @click="selectionStore.deselectAll"
      />
      <v-btn
        icon="mdi-checkbox-multiple-marked-circle-outline"
        variant="plain"
        density="compact"
        @click="selectionStore.selectAll"
        v-tooltip:top="'Select all'"
      />
      <div class="select-text">
        <span class="bold-select">{{ selectionStore.selection.size }}</span
        ><span> selected</span>
      </div>
      <v-spacer />
      <add-to-album-button
        :exclude-album-ids="excludeAlbumIds"
        :ids-to-add="[...selectionStore.selection]"
      />
      <v-btn
        icon="mdi-delete-outline"
        variant="plain"
        density="compact"
        v-tooltip:top="'Move to bin'"
      />

      <v-menu>
        <template v-slot:activator="{ props }">
          <v-btn v-bind="props" icon="mdi-dots-horizontal" variant="plain" density="compact" />
        </template>
        <v-list density="compact">
          <v-list-item
            v-if="context && context.album"
            @click="albumStore.removeFromAlbum(context.album, [...selectionStore.selection])"
          >
            <v-list-item-title>Remove from album</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>
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
  color: rgba(var(--v-theme-on-surface-container-high), 1);
  box-shadow:
    0 4px 8px 0 rgba(0, 0, 0, 0.2),
    0 6px 20px 0 rgba(0, 0, 0, 0.19);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.bold-select {
  font-weight: 600;
}
</style>
