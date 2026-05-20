<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MainLayoutContainer from '@/vues/components/MainLayoutContainer.vue'
import PhotoMap from '@/vues/components/map/PhotoMap.vue'
import SimpleTimeline from '@/vues/components/timeline/simple-timeline/SimpleTimeline.vue'
import mediaItemService from '@/scripts/services/mediaItemService.ts'
import type { MapPhotoItem, SimpleTimelineItem } from '@/scripts/types/generated/timeline.ts'

const route = useRoute()
const router = useRouter()

const geoItems = ref<MapPhotoItem[]>([])
const viewportItems = ref<SimpleTimelineItem[]>([])
const activePhotoId = ref<string | null>(null)
const sidebarOpen = ref(true)
const loading = ref(true)
const loadError = ref<string | null>(null)

const photoCount = computed(() => geoItems.value.length)
const viewportCount = computed(() => viewportItems.value.length)

onMounted(async () => {
  try {
    const response = await mediaItemService.getGeoPhotos()
    geoItems.value = response.items
  } catch (err) {
    console.error('Failed to load geo photos', err)
    loadError.value = 'Could not load map photos.'
  } finally {
    loading.value = false
  }
})

function onViewportItems(items: SimpleTimelineItem[]) {
  viewportItems.value = items
}

function onHoverPhoto(id: string | null) {
  activePhotoId.value = id
}

function onClickPhoto(id: string) {
  router.push({
    name: 'view-photo-map',
    params: { mediaId: id },
    query: route.query,
  })
}

function onSidebarMouseOver(event: MouseEvent) {
  const target = event.target as HTMLElement | null
  const item = target?.closest('[data-id]') as HTMLElement | null
  activePhotoId.value = item?.getAttribute('data-id') ?? null
}

function onSidebarMouseLeave() {
  activePhotoId.value = null
}
</script>

<template>
  <main-layout-container class="map-view-root">
    <teleport to="body">
      <router-view />
    </teleport>

    <div class="map-page" v-if="!loading">
      <photo-map
        class="map-canvas"
        :items="geoItems"
        :active-photo-id="activePhotoId"
        @update:viewport-items="onViewportItems"
        @hover:photo="onHoverPhoto"
        @click:photo="onClickPhoto"
      />

      <aside class="map-sidebar" :class="{ collapsed: !sidebarOpen }">
        <div class="sidebar-toolbar">
          <v-btn
            icon
            variant="text"
            density="comfortable"
            class="sidebar-toggle"
            :title="sidebarOpen ? 'Hide sidebar' : 'Show sidebar'"
            @click="sidebarOpen = !sidebarOpen"
          >
            <v-icon :icon="sidebarOpen ? 'mdi-chevron-right' : 'mdi-chevron-left'" />
          </v-btn>
          <div class="sidebar-meta" v-if="sidebarOpen">
            <span class="sidebar-title">In view</span>
            <span class="sidebar-count">{{ viewportCount.toLocaleString() }}</span>
            <span class="sidebar-subtitle" v-if="photoCount > 0">
              of {{ photoCount.toLocaleString() }} on map
            </span>
          </div>
        </div>

        <div
          v-show="sidebarOpen"
          class="sidebar-timeline"
          @mouseover="onSidebarMouseOver"
          @mouseleave="onSidebarMouseLeave"
        >
          <simple-timeline
            v-if="viewportItems.length > 0"
            bare
            :timeline-items="viewportItems"
            view-link="/map/view/"
          />
          <div v-else class="sidebar-empty">
            <v-icon icon="mdi-map-search-outline" size="40" class="sidebar-empty-icon" />
            <p>Pan or zoom the map to see photos in this area.</p>
          </div>
        </div>
      </aside>
    </div>

    <div v-else-if="loadError" class="map-state">
      <v-icon icon="mdi-alert-circle-outline" size="48" />
      <p>{{ loadError }}</p>
    </div>

    <div v-else class="map-state">
      <v-progress-circular indeterminate color="primary" size="56" />
      <p>Loading map…</p>
    </div>
  </main-layout-container>
</template>

<style scoped>
.map-view-root :deep(.outer-container) {
  max-width: 100%;
}

.map-view-root :deep(.inner-container) {
  padding: 0;
  margin: 0;
  width: 100%;
  height: 100%;
}

.map-page {
  display: flex;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.map-canvas {
  flex: 1;
  min-width: 0;
}

.map-sidebar {
  width: 380px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  border-left: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  background: rgba(var(--v-theme-surface), 0.55);
  transition: width 0.2s ease;
}

.map-sidebar.collapsed {
  width: 48px;
}

.sidebar-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 8px;
  flex-shrink: 0;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.08);
}

.sidebar-meta {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.sidebar-title {
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  opacity: 0.65;
}

.sidebar-count {
  font-size: 1.35rem;
  font-weight: 600;
  line-height: 1.2;
}

.sidebar-subtitle {
  font-size: 0.8rem;
  opacity: 0.55;
}

.sidebar-timeline {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.sidebar-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 32px 20px;
  height: 100%;
  opacity: 0.7;
}

.sidebar-empty-icon {
  opacity: 0.35;
  margin-bottom: 12px;
}

.sidebar-empty p {
  margin: 0;
  max-width: 240px;
  line-height: 1.45;
}

.map-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  height: 100%;
  opacity: 0.8;
}
</style>
