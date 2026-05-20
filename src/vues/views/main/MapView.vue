<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useEventListener, useStorage } from '@vueuse/core'
import MainLayoutContainer from '@/vues/components/MainLayoutContainer.vue'
import PhotoMap from '@/vues/components/map/PhotoMap.vue'
import SimpleTimeline from '@/vues/components/timeline/simple-timeline/SimpleTimeline.vue'
import mediaItemService from '@/scripts/services/mediaItemService.ts'
import { computeGeoMapView } from '@/scripts/map/geoMapView.ts'
import type { MapPhotoItem, SimpleTimelineItem } from '@/scripts/types/generated/timeline.ts'

const route = useRoute()
const router = useRouter()

const geoItems = ref<MapPhotoItem[]>([])
const viewportItems = ref<SimpleTimelineItem[]>([])
const hoverPhotoId = ref<string | null>(null)
const selectedPhotoId = ref<string | null>(null)
const selectedClusterKey = ref<string | null>(null)
const clusterItems = ref<SimpleTimelineItem[]>([])
const sidebarOpen = useStorage('mapSidebarOpen', true)
const sidebarWidth = useStorage('mapSidebarWidth', 480)
const loading = ref(true)
const loadError = ref<string | null>(null)

const mapPageRef = ref<HTMLElement | null>(null)
const isResizing = ref(false)

const MIN_SIDEBAR_WIDTH = 280
const MIN_MAP_WIDTH = 500
const CLOSE_SIDEBAR_WIDTH = 120

function maxSidebarWidth(pageWidth: number) {
  return Math.max(MIN_SIDEBAR_WIDTH, pageWidth - MIN_MAP_WIDTH)
}

function clampSidebarWidth() {
  if (!sidebarOpen.value || !mapPageRef.value) return
  const max = maxSidebarWidth(mapPageRef.value.clientWidth)
  if (sidebarWidth.value > max) sidebarWidth.value = max
  if (sidebarWidth.value < MIN_SIDEBAR_WIDTH) sidebarWidth.value = MIN_SIDEBAR_WIDTH
}

const photoCount = computed(() => geoItems.value.length)
const isClusterMode = computed(() => selectedClusterKey.value !== null)
const sidebarItems = computed(() =>
  isClusterMode.value ? clusterItems.value : viewportItems.value,
)
const sidebarCount = computed(() => sidebarItems.value.length)

const initialMapView = computed(() => computeGeoMapView(geoItems.value))

onMounted(async () => {
  try {
    const response = await mediaItemService.getGeoPhotos()
    geoItems.value = response.items
  } catch (err) {
    console.error('Failed to load geo photos', err)
    loadError.value = 'Could not load map photos.'
  } finally {
    loading.value = false
    nextTick(() => clampSidebarWidth())
  }
})

useEventListener(window, 'resize', () => clampSidebarWidth())

function onViewportItems(items: SimpleTimelineItem[]) {
  viewportItems.value = items
}

function onHoverPhoto(id: string | null) {
  hoverPhotoId.value = id
}

function onSelectPhoto(id: string) {
  selectedPhotoId.value = id
  selectedClusterKey.value = null
  clusterItems.value = []
}

function onSelectCluster(payload: {
  key: string
  items: SimpleTimelineItem[]
  previewId?: string
}) {
  selectedClusterKey.value = payload.key
  clusterItems.value = payload.items
  selectedPhotoId.value = payload.previewId ?? null
}

function onDeselect() {
  selectedPhotoId.value = null
  selectedClusterKey.value = null
  clusterItems.value = []
}

function clearClusterSelection() {
  onDeselect()
}

function onOpenPhoto(id: string) {
  router.push({
    name: 'view-photo-map',
    params: { mediaId: id },
    query: route.query,
  })
}

function onSidebarMouseOver(event: MouseEvent) {
  const target = event.target as HTMLElement | null
  const item = target?.closest('[data-id]') as HTMLElement | null
  hoverPhotoId.value = item?.getAttribute('data-id') ?? null
}

function onSidebarMouseLeave() {
  hoverPhotoId.value = null
}

function onSplitterMouseDown(event: MouseEvent) {
  event.preventDefault()
  isResizing.value = true
  const startX = event.clientX
  const startWidth = sidebarWidth.value
  const pageWidth = mapPageRef.value?.clientWidth ?? window.innerWidth

  const onMove = (moveEvent: MouseEvent) => {
    const delta = startX - moveEvent.clientX
    const nextWidth = startWidth + delta
    const maxAllowed = maxSidebarWidth(pageWidth)

    if (nextWidth < CLOSE_SIDEBAR_WIDTH) {
      sidebarOpen.value = false
      return
    }

    sidebarWidth.value = Math.round(Math.min(maxAllowed, Math.max(MIN_SIDEBAR_WIDTH, nextWidth)))
  }

  const onUp = () => {
    isResizing.value = false
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }

  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
}

useEventListener(document, 'mouseup', () => {
  if (isResizing.value) {
    isResizing.value = false
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }
})

watch(sidebarOpen, (open) => {
  if (open) nextTick(() => clampSidebarWidth())
})

watch([selectedPhotoId, () => sidebarItems.value], () => {
  const id = selectedPhotoId.value
  if (!id || !sidebarOpen.value) return
  nextTick(() => {
    const el = document.querySelector(`.sidebar-timeline [data-id="${id}"]`)
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  })
})
</script>

<template>
  <main-layout-container class="map-view-root" :class="{ 'is-resizing': isResizing }">
    <teleport to="body">
      <router-view />
    </teleport>

    <div class="map-page" ref="mapPageRef" v-if="!loading">
      <div class="map-main">
        <photo-map
          class="map-canvas"
          :items="geoItems"
          :initial-center="initialMapView.center"
          :initial-zoom="initialMapView.zoom"
          :selected-photo-id="selectedPhotoId"
          :selected-cluster-key="selectedClusterKey"
          :hover-photo-id="hoverPhotoId"
          @update:viewport-items="onViewportItems"
          @hover:photo="onHoverPhoto"
          @select:photo="onSelectPhoto"
          @select:cluster="onSelectCluster"
          @deselect="onDeselect"
          @open:photo="onOpenPhoto"
        />

        <v-btn
          v-if="!sidebarOpen"
          class="sidebar-reopen-fab"
          icon="mdi-dock-right"
          color="primary"
          variant="flat"
          elevation="1"
          title="Show photos panel"
          @click="sidebarOpen = true"
        />
      </div>

      <div
        v-if="sidebarOpen"
        class="map-splitter"
        title="Drag to resize"
        @mousedown="onSplitterMouseDown"
      />

      <aside
        v-show="sidebarOpen"
        class="map-sidebar"
        :class="{ 'cluster-mode': isClusterMode }"
        :style="{ width: `${sidebarWidth}px` }"
      >
        <div class="sidebar-toolbar">
          <div class="sidebar-meta">
            <template v-if="isClusterMode">
              <span class="sidebar-title">Cluster</span>
              <span class="sidebar-count">{{ sidebarCount.toLocaleString() }}</span>
              <span class="sidebar-subtitle">photos in this group</span>
            </template>
            <template v-else>
              <span class="sidebar-title">In view</span>
              <span class="sidebar-count">{{ sidebarCount.toLocaleString() }}</span>
              <span class="sidebar-subtitle" v-if="photoCount > 0">
                of {{ photoCount.toLocaleString() }} on map
              </span>
            </template>
          </div>
          <div class="sidebar-actions">
            <v-btn
              v-if="isClusterMode"
              variant="tonal"
              size="small"
              density="comfortable"
              @click="clearClusterSelection"
            >
              Show map view
            </v-btn>
            <v-btn
              icon="mdi-close"
              variant="text"
              density="comfortable"
              title="Hide sidebar"
              @click="sidebarOpen = false"
            />
          </div>
        </div>

        <div
          class="sidebar-timeline"
          :class="{ 'cluster-mode': isClusterMode }"
          @mouseover="onSidebarMouseOver"
          @mouseleave="onSidebarMouseLeave"
        >
          <simple-timeline
            class="simple-timeline-el"
            v-if="sidebarItems.length > 0"
            bare
            :timeline-items="sidebarItems"
            view-link="/map/view/"
          />
          <div v-else class="sidebar-empty">
            <v-icon icon="mdi-map-search-outline" size="40" class="sidebar-empty-icon" />
            <p v-if="isClusterMode">No photos in this cluster.</p>
            <p v-else>Pan or zoom the map to see photos in this area.</p>
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

.map-view-root.is-resizing {
  cursor: col-resize;
}

.map-page {
  display: flex;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.map-main {
  position: relative;
  flex: 1;
  min-width: 0;
}

.map-canvas {
  width: 100%;
  height: 100%;
}

.map-splitter {
  flex-shrink: 0;
  width: 6px;
  cursor: col-resize;
  background: transparent;
  position: relative;
  z-index: 2;
  transition: background 0.15s;
}

.map-splitter::after {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: 2px;
  width: 2px;
  border-radius: 2px;
  background: rgba(var(--v-theme-on-surface), 0.15);
  transition: background 0.15s;
}

.map-splitter:hover::after,
.map-view-root.is-resizing .map-splitter::after {
  background-color: rgb(var(--v-theme-primary));
}

.map-sidebar {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  border-left: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  background: rgba(var(--v-theme-surface), 0.55);
  min-width: 0;
}

.map-sidebar.cluster-mode {
  border-left-color: rgba(var(--v-theme-primary), 0.35);
}

.sidebar-reopen-fab {
  position: absolute;
  top: 30px;
  right: 30px;
  z-index: 4;
}

.sidebar-toolbar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  padding: 12px 10px 10px 14px;
  flex-shrink: 0;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.08);
}

.sidebar-meta {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.sidebar-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
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

.sidebar-timeline :deep(.simple-timeline) {
  height: 100%;
}

.sidebar-timeline :deep(.timeline-shell) {
  height: 100%;
}

.sidebar-timeline.cluster-mode :deep(.simple-timeline) {
  box-shadow: inset 3px 0 0 rgb(var(--v-theme-primary));
}

.simple-timeline-el {
  width: calc(100% + 50px);
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
