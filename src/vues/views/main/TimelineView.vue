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
import { onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '@/scripts/stores/authStore.ts'
import { useThrottleFn } from '@vueuse/core'

const timelineStore = useTimelineStore()
const settings = useSettingStore()
const authStore = useAuthStore()

const emit = defineEmits(['onScroll'])

const { container, width, height } = useContainerResize()
const { rows, PHOTO_GAP } = usePhotoGrid(width, settings, timelineStore)
const { handleIsVisible, rowInViewDate } = usePhotoVisibility(timelineStore)
const { hoverDate, dateInViewString, activateScrollOverride } = useDateOverlay(rowInViewDate)

const onScrollEvent = useThrottleFn((e: WheelEvent) => {
  emit('onScroll', e)
  activateScrollOverride(e)
}, 25)

timelineStore.fetchRatios()

let ws: WebSocket | null = null

onMounted(() => {
  const token = authStore.accessToken
  ws = new WebSocket('ws://localhost:9475/timeline/ws', ['access_token', token])

  ws.onopen = () => console.log('Connected to websocket for timeline updates!')
  ws.onmessage = (e) => console.log('New Media')
})

onUnmounted(() => {
  if (ws) {
    ws.close()
  }
})
</script>

<template>
  <div>
    <date-overlay :date="dateInViewString" />
    <div class="photo-grid-container" ref="container">
      <v-virtual-scroll
        @scroll="onScrollEvent"
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
  height: 100%;
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
