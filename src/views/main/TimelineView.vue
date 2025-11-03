<script setup lang="ts">
import DateOverlay from '@/components/photo-grid/DateOverlay.vue'
import { useDateOverlay } from '@/composables/photo-grid/useDateOverlay.ts'
import { usePhotoVisibility } from '@/composables/photo-grid/usePhotoVisibility.ts'
import { usePhotoGrid } from '@/composables/photo-grid/usePhotoGrid.ts'
import { useContainerResize } from '@/composables/photo-grid/useContainerResize.ts'
import { useTimelineStore } from '@/stores/timelineStore.ts'
import GridRowHeader from '@/components/photo-grid/GridRowHeader.vue'
import GridRow from '@/components/photo-grid/GridRow.vue'

const timelineStore = useTimelineStore()

const { container, width, height } = useContainerResize()
const { rows, PHOTO_GAP } = usePhotoGrid(width, timelineStore)
const { handleIsVisible, rowInViewDate } = usePhotoVisibility(timelineStore)
const { hoverDate, dateInViewString, activateScrollOverride } = useDateOverlay(rowInViewDate)

timelineStore.fetchRatios()
</script>

<template>
  <div>
    <date-overlay :date="dateInViewString" />
    <div class="photo-grid-container" ref="container">
      <v-virtual-scroll
        @scroll="activateScrollOverride"
        :items="rows"
        :height="height"
        item-key="key"
        class="scroll-container"
      >
        <template #default="{ item }">
          <grid-row-header v-if="item.firstOfTheMonth" :row="item" />
          <grid-row
            @hover-item="(date) => (hoverDate = date)"
            :photo-gap="PHOTO_GAP"
            :media-items="timelineStore.mediaItems.get(item.monthId)"
            :row="item"
            v-intersect="(e: boolean) => handleIsVisible(e, item)"
          />
        </template>
      </v-virtual-scroll>
    </div>
    <teleport to="body">
      <router-view class="my-router-view" />
    </teleport>
  </div>
</template>

<style scoped>
.photo-grid-container {
  height: 100%;
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
