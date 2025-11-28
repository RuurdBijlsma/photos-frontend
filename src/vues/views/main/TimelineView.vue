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
import type { VVirtualScroll } from 'vuetify/components'

const timelineStore = useTimelineStore()
const settings = useSettingStore()
const authStore = useAuthStore()

const { setDateInView, scrollToDate, clearScrollRequest } = useTimelineScroll()
const { container, width, height } = useContainerResize()
const { rows, PHOTO_GAP } = usePhotoGrid(width, settings, timelineStore)
const { handleIsVisible, rowInViewDate } = usePhotoVisibility(timelineStore)
const { hoverDate, dateInViewString, activateScrollOverride } = useDateOverlay(rowInViewDate)
useTimelineWebSocket(authStore)

const virtualScrollRef = ref<VVirtualScroll | null>(null)

watch(rowInViewDate, () => {
  setDateInView(rowInViewDate.value)
})

// Handle scroll requests from TimelineScroll
watch(scrollToDate, (date) => {
  if (!date) return

  // Format the month ID to match the rows (YYYY-MM-01)
  const monthStr = (date.getMonth() + 1).toString().padStart(2, '0')
  const targetMonthId = `${date.getFullYear()}-${monthStr}-01`
  const startIndex = rows.value.findIndex((row) => row.monthId === targetMonthId)

  if (startIndex !== -1 && virtualScrollRef.value) {
    setDateInView(date)
    // Interpolate to row in month
    // -- Count rows in month:
    let monthRowCount = 0
    for (let i = startIndex; i < rows.value.length; i++) {
      if (rows.value[i]!.monthId === targetMonthId) {
        monthRowCount++
      } else {
        break // Stop when we hit the next month
      }
    }
    // -- Interpolate to right row based on target date
    const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
    const day = date.getDate()
    const ratio = Math.min(1, Math.max(0, (day - 1) / (daysInMonth - 1 || 1)))
    const offset = Math.round((monthRowCount - 1) * (1 - ratio))
    virtualScrollRef.value.scrollToIndex(startIndex + offset)
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
