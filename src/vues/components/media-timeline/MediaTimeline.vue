<script setup lang="ts">
import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import type { VVirtualScroll } from 'vuetify/components'

// Components
import DateOverlay from '@/vues/components/media-timeline/DateOverlay.vue'
import GridRowHeader from '@/vues/components/photo-grid/GridRowHeader.vue'
import GridRow from '@/vues/components/photo-grid/GridRow.vue'
import MainLayoutContainer from '@/vues/components/MainLayoutContainer.vue'

// Types & Services
import type { GenericTimeline } from '@/scripts/services/timeline/GenericTimeline.ts'
import { useSettingStore } from '@/scripts/stores/settingsStore.ts'
import { useSelectionStore } from '@/scripts/stores/selectionStore.ts'

// Composables
import { useContainerResize } from '@/scripts/composables/photo-grid/useContainerResize.ts'
import { usePhotoGrid } from '@/scripts/composables/photo-grid/usePhotoGrid.ts'
import { useRowVisibility } from '@/scripts/composables/photo-grid/useRowVisibility.ts'
import { useDateOverlay } from '@/scripts/composables/photo-grid/useDateOverlay.ts'
import { useTimelineSelection } from '@/scripts/composables/photo-grid/useTimelineSelection.ts'
import { useTimelineScrollSync } from '@/scripts/composables/photo-grid/useTimelineScrollSync.ts'

const props = withDefaults(
  defineProps<{
    timelineController: GenericTimeline
    sortOrder?: 'asc' | 'desc'
  }>(),
  {
    sortOrder: 'desc',
  },
)

// --- Stores ---
const settings = useSettingStore()
const selectionStore = useSelectionStore()

// --- Template Refs ---
const virtualScrollRef = ref<VVirtualScroll | null>(null)

// --- Composables Setup ---

// 1. Grid & Layout
const { container, width, height } = useContainerResize()
const { rows, PHOTO_GAP } = usePhotoGrid(width, settings, props.timelineController)

// 2. Visibility Tracking (What date is currently looked at?)
const { handleIsVisible, rowInViewDate } = useRowVisibility(props.timelineController)

// 3. Date Overlay (The floating date badge)
const { hoverDate, dateInViewString, activateScrollOverride } = useDateOverlay(rowInViewDate)

// 4. Selection Logic (Click, Shift+Click, Undo/Redo)
const { selectItem } = useTimelineSelection(selectionStore, props.timelineController)

// 5. Scroll Synchronization (Global requests <-> Virtual Scroll Index)
const { handleScroll } = useTimelineScrollSync(
  virtualScrollRef,
  rows,
  rowInViewDate,
  props.sortOrder,
  activateScrollOverride
)
</script>

<template>
  <main-layout-container>
    <date-overlay :date="dateInViewString" />
    <div class="photo-grid-container" ref="container">
      <v-virtual-scroll
        ref="virtualScrollRef"
        @scroll="handleScroll"
        :items="rows"
        :height="height"
        item-key="key"
        class="scroll-container"
      >
        <template #default="{ item }">
          <grid-row-header v-if="item.firstOfTheMonth" :row="item" />
          <grid-row
            @selection-click="(payload) => selectItem(payload.event, payload.id)"
            @hover-item="(date) => (hoverDate = date)"
            :photo-gap="PHOTO_GAP"
            :media-items="timelineController.mediaItems.get(item.monthId)"
            :row="item"
            v-intersect="(e: boolean) => handleIsVisible(e, item)"
          />
        </template>
      </v-virtual-scroll>
    </div>
  </main-layout-container>

  <teleport to="body">
    <router-view :ids="timelineController.ids" :fetch-ids="timelineController.fetchIds" />
  </teleport>
</template>

<style scoped>
.photo-grid-container {
  height: calc(100% + 7px);
  margin-top: -7px;
}

.scroll-container {
  padding-bottom: 10px;
  overflow: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.scroll-container::-webkit-scrollbar {
  width: 0;
  height: 0;
  background: transparent;
}
</style>
