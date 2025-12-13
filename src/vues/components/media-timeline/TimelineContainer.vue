<script setup lang="ts">
import TimelineScroll from '@/vues/components/media-timeline/TimelineScroll.vue'
import MediaTimeline from '@/vues/components/media-timeline/MediaTimeline.vue'
import type { GenericTimeline } from '@/scripts/services/timeline/GenericTimeline.ts'
import type { SortDirection } from '@/scripts/types/api/album.ts'

const props = withDefaults(
  defineProps<{
    timelineController: GenericTimeline
    sortDirection?: SortDirection
  }>(),
  {
    sortDirection: 'desc',
  },
)
</script>

<template>
  <div class="timeline-container">
    <media-timeline
      :timeline-controller="props.timelineController"
      :sort-direction="props.sortDirection"
    />
    <timeline-scroll
      :sort-direction="props.sortDirection"
      :months="props.timelineController.timeline"
      class="scroll-area"
    />
  </div>
</template>

<style scoped>
.timeline-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: row;
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
