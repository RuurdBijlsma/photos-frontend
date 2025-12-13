<script setup lang="ts">
import TimelineContainer from '@/vues/components/media-timeline/TimelineContainer.vue'
import { useTimelineWebSocket } from '@/scripts/composables/timeline-frontpage/useTimelineWebSocket.ts'
import { useAuthStore } from '@/scripts/stores/authStore.ts'
import { useTimelineStore } from '@/scripts/stores/timelineStore.ts'

const authStore = useAuthStore()
const timelineStore = useTimelineStore()
useTimelineWebSocket(authStore)
</script>

<template>
  <timeline-container
    class="timeline"
    :timeline-controller="timelineStore.controller"
    sort-direction="desc"
  />
</template>

<style scoped>
.timeline {
  width: 100%;
  height: 100%;
}
</style>
