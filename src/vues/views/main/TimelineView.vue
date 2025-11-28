<script setup lang="ts">
import DateOverlay from '@/vues/components/photo-grid/DateOverlay.vue'
import { useDateOverlay } from '@/scripts/composables/photo-grid/useDateOverlay.ts'
import { usePhotoVisibility } from '@/scripts/composables/photo-grid/usePhotoVisibility.ts'
import { usePhotoGrid } from '@/scripts/composables/photo-grid/usePhotoGrid.ts'
import { useContainerResize } from '@/scripts/composables/photo-grid/useContainerResize.ts'
import { useTimelineStore } from '@/scripts/stores/timelineStore.ts'
import GridRowHeader from '@/vues/components/photo-grid/GridRowHeader.vue'
import GridRow from '@/vues/components/photo-grid/GridRow.vue'
import { useSettingStore } from '@/scripts/stores/settingsStore.ts'
import { ref, watch } from 'vue'
import { useAuthStore } from '@/scripts/stores/authStore.ts'
import { useTimelineScroll } from '@/scripts/composables/photo-grid/useTimelineScroll.ts'
import { useTimelineWebSocket } from '@/scripts/composables/photo-grid/useTimelineWebSocket.ts'

const timelineStore = useTimelineStore()
const settings = useSettingStore()
const authStore = useAuthStore()

const { setDateInView, scrollToDate, clearScrollRequest } = useTimelineScroll()
const { container, width, height } = useContainerResize()
const { rows, PHOTO_GAP } = usePhotoGrid(width, settings, timelineStore)
const { handleIsVisible, rowInViewDate } = usePhotoVisibility(timelineStore)
const { hoverDate, dateInViewString, activateScrollOverride } = useDateOverlay(rowInViewDate)
useTimelineWebSocket(authStore)

const virtualScrollRef = ref<any>(null)

// Update the shared state when the date in view changes
watch(rowInViewDate, () => {
  setDateInView(rowInViewDate.value)
})

// Handle scroll requests from TimelineScroll
watch(scrollToDate, (date) => {
  if (!date) return

  // Find the row index for this date
  const monthStr = (date.getMonth() + 1).toString().padStart(2, '0')
  const targetMonthId = `${date.getFullYear()}-${monthStr}-01`
  const rowIndex = rows.value.findIndex((row) => row.monthId === targetMonthId)

  if (rowIndex !== -1 && virtualScrollRef.value) {
    // Scroll to the row
    virtualScrollRef.value.scrollToIndex(rowIndex)
  }

  // Clear the request
  clearScrollRequest()
})


</script>

<template>
  <div>
    <date-overlay :date="dateInViewString" />
    <div class="photo-grid-container" ref="container">
      <v-virtual-scroll
        ref="virtualScrollRef"
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
      <router-view />
    </teleport>
  </div>
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
