<script setup lang="ts">
import { ref, toRef } from 'vue'
import type { VVirtualScroll } from 'vuetify/components'
import GridRowHeader from '@/vues/components/photo-grid/GridRowHeader.vue'
import GridRow from '@/vues/components/photo-grid/GridRow.vue'
import MainLayoutContainer from '@/vues/components/MainLayoutContainer.vue'
import type { GenericTimeline } from '@/scripts/services/timeline/GenericTimeline.ts'
import { useSettingStore } from '@/scripts/stores/settingsStore.ts'
import { useSelectionStore } from '@/scripts/stores/selectionStore.ts'
import { useContainerResize } from '@/scripts/composables/photo-grid/useContainerResize.ts'
import { usePhotoGrid } from '@/scripts/composables/photo-grid/usePhotoGrid.ts'
import { useDateOverlay } from '@/scripts/composables/photo-grid/useDateOverlay.ts'
import { useTimelineSelection } from '@/scripts/composables/photo-grid/useTimelineSelection.ts'
import { useTimelineScrollSync } from '@/scripts/composables/photo-grid/useTimelineScrollSync.ts'
import DateOverlay from '@/vues/components/media-timeline/DateOverlay.vue'
import SelectionOverlay from '@/vues/components/media-timeline/SelectionOverlay.vue'
import type { SortDirection } from '@/scripts/types/api/album.ts'
import { useTimelineScroll } from '@/scripts/composables/photo-grid/useTimelineScroll.ts'
import { useThrottleFn } from '@vueuse/core'

const props = withDefaults(
  defineProps<{
    timelineController: GenericTimeline
    sortDirection?: SortDirection
  }>(),
  {
    sortDirection: 'desc',
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
const { rows, rowOffsets, PHOTO_GAP } = usePhotoGrid(
  width,
  settings,
  toRef(props, 'timelineController'),
)

// 3. Date Overlay
const { dateInView, scrollTop } = useTimelineScroll()
const { hoverDate, dateInViewString, activateScrollOverride } = useDateOverlay(
  dateInView,
  scrollTop,
)

// 4. Selection Logic
const { selectItem, deselectAll, setHoveredId, previewAddIds, previewRemoveIds } =
  useTimelineSelection(selectionStore, props.timelineController)

// 5. Scroll Sync
useTimelineScrollSync(
  virtualScrollRef,
  rows,
  rowOffsets,
  props.timelineController,
  props.sortDirection,
)
const { setScrollTop } = useTimelineScroll()
function handleScrollRaw(e: WheelEvent) {
  activateScrollOverride()
  if (e.target) {
    const target = e.target as HTMLElement
    setScrollTop(target.scrollTop)
  }
}
const handleScroll = useThrottleFn(handleScrollRaw, 10)

// Handler to split the hover payload
function onHoverItem(payload: { date: Date | null; id: string | null }) {
  hoverDate.value = payload.date
  setHoveredId(payload.id)
}
</script>

<template>
  <main-layout-container>
    <date-overlay :date="dateInViewString" />
    <selection-overlay @deselect-all="deselectAll" />
    <div
      class="photo-grid-container"
      ref="container"
      :class="{ 'is-selecting': selectionStore.size > 0 }"
    >
      <v-virtual-scroll
        ref="virtualScrollRef"
        @scroll.passive="handleScroll"
        :items="rows"
        :height="height"
        item-key="key"
        class="scroll-container"
      >
        <template #default="{ item, index }">
          <slot name="default" v-if="index === 0" />
          <grid-row-header v-if="item.firstOfTheMonth" :row="item" />
          <grid-row
            @selection-click="(payload) => selectItem(payload.event, payload.id)"
            @hover-item="onHoverItem"
            :photo-gap="PHOTO_GAP"
            :media-items="timelineController.mediaItems.get(item.monthId)"
            :row="item"
            :preview-add-ids="previewAddIds"
            :preview-remove-ids="previewRemoveIds"
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
