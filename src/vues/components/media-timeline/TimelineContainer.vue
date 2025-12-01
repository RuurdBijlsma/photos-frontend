<script setup lang="ts">
import TimelineScroll from '@/vues/components/media-timeline/TimelineScroll.vue'
import { useTimelineStore } from '@/scripts/stores/timelineStore.ts'
import MediaTimeline from '@/vues/components/media-timeline/MediaTimeline.vue'
import type { GenericTimeline } from '@/scripts/services/timeline/GenericTimeline.ts'

const timelineStore = useTimelineStore()

const props = defineProps<{
  timelineController: GenericTimeline
}>()
</script>

<template>
  <div class="timeline-container">
      <media-timeline
        class="timeline-grid"
        :timeline-controller="props.timelineController"
      />
    <timeline-scroll :months="timelineStore.controller.timeline" class="scroll-area" />
  </div>
</template>

<style scoped>
.timeline-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: row;
}

.timeline-grid {
  height: calc(100% - 10px);
  width: calc(100% - 20px);
  margin: 10px 10px 0;
  border-radius: 55px 55px 0 0;
  overflow: hidden;
  overflow-y: auto;

  -ms-overflow-style: none;
  scrollbar-width: none;
}

.timeline-grid::-webkit-scrollbar {
  display: none;
}

.scroll-area {
  margin: 15px 0 0;
  width: 50px;
  height: calc(100% - 15px);
  opacity: 0.8;
  transition: opacity 0.2s;
}

.scroll-area:hover {
  opacity: 1;
}
</style>
