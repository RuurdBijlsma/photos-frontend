<script setup lang="ts">
import type { AlbumTimelineItem } from '@/scripts/types/generated/timeline.ts'
import { computed, ref, shallowRef, useTemplateRef, watch } from 'vue'
import type { SimpleLayoutRow } from '@/scripts/types/timeline/layout.ts'
import { getThumbnailHeight } from '@/scripts/utils.ts'
import { useDebounceFn, useEventListener, useResizeObserver, useThrottleFn } from '@vueuse/core'
import { useVirtualizer } from '@tanstack/vue-virtual'
import VirtualSimpleRow from '@/vues/components/simple-timeline/VirtualSimpleRow.vue'
import MainLayoutContainer from '@/vues/components/MainLayoutContainer.vue'
import SelectionOverlay from '@/vues/components/timeline/SelectionOverlay.vue'
import { useViewPhotoStore } from '@/scripts/stores/timeline/viewPhotoStore.ts'
import { useSelectionStore } from '@/scripts/stores/timeline/selectionStore.ts'
import { useRoute } from 'vue-router'

const props = defineProps<{
  timelineItems: AlbumTimelineItem[]
}>()

const route = useRoute()
const viewPhotoStore = useViewPhotoStore()
const selectionStore = useSelectionStore()

const IDEAL_ROW_HEIGHT = 240
const MAX_SIZE_MULTIPLIER = 1.5
const ITEM_GAP = 2
const MIN_THUMB_HEIGHT = 20
const SNAP_MARGIN = 20

const gridLayout = shallowRef<SimpleLayoutRow[]>([])
const scrollContainerEl = useTemplateRef('scrollContainer')
const scrollTrackEl = useTemplateRef('scrollTrack')
const containerHeight = ref(0)
const containerWidth = ref(0)
const contentHeight = ref(0)
const trackHeight = ref(0)
const scrollTop = ref(0)
const isScrollingFast = ref(false)
const thumbHeight = computed(() => {
  if (contentHeight.value <= containerHeight.value || containerHeight.value === 0) return 0
  const ratio = containerHeight.value / contentHeight.value
  const calculatedHeight = trackHeight.value * ratio
  return Math.max(calculatedHeight, MIN_THUMB_HEIGHT)
})
const thumbTranslateY = computed(() => {
  const maxScroll = contentHeight.value - containerHeight.value
  const maxThumbTravel = trackHeight.value - thumbHeight.value
  if (maxScroll <= 0 || maxThumbTravel <= 0) return 0
  const scrollRatio = scrollTop.value / maxScroll
  const clampedRatio = Math.min(1, Math.max(0, scrollRatio))
  return clampedRatio * maxThumbTravel
})
const showScrollbar = computed(() => {
  return contentHeight.value > containerHeight.value && containerHeight.value > 0
})
const virtualizerOptions = computed(() => ({
  count: gridLayout.value.length,
  getScrollElement: () => scrollContainerEl.value,
  estimateSize: (index: number) => {
    const row = gridLayout.value[index]
    if (!row) return 0
    return row.height + ITEM_GAP
  },
  overscan: 5,
}))
const rowVirtualizer = useVirtualizer(virtualizerOptions)

let isDragging = false
let lastScrollTop = 0
let dragStartOffsetY = 0

function calculateLayout(timelineItems: AlbumTimelineItem[], containerWidth: number) {
  if (timelineItems.length === 0 || containerWidth === 0) return { rows: [], totalHeight: 0 }
  const layoutRows: SimpleLayoutRow[] = []
  let rowWidth = 0
  let offsetTop = 0
  let rowItems: AlbumTimelineItem[] = []

  for (const [i, item] of timelineItems.entries()) {
    rowItems.push(item)
    const gapSize = (rowItems.length - 1) * ITEM_GAP
    rowWidth += IDEAL_ROW_HEIGHT * item.ratio
    if (rowWidth + gapSize > containerWidth) {
      const sizeMultiplier = Math.min((containerWidth - gapSize) / rowWidth, MAX_SIZE_MULTIPLIER)
      const rowHeight = IDEAL_ROW_HEIGHT * sizeMultiplier
      layoutRows.push({
        items: rowItems,
        height: rowHeight,
        key: layoutRows.length.toString(),
        offsetTop,
        thumbnailSize: getThumbnailHeight(rowHeight),
        firstRow: layoutRows.length === 0,
        lastRow: i === timelineItems.length - 1,
      })
      rowItems = []
      rowWidth = 0
      offsetTop += Math.round(rowHeight)
    }
  }

  if (rowItems.length > 0) {
    const sizeMultiplier = Math.min(containerWidth / rowWidth, MAX_SIZE_MULTIPLIER)
    const rowHeight = IDEAL_ROW_HEIGHT * sizeMultiplier
    layoutRows.push({
      items: rowItems,
      height: rowHeight,
      key: layoutRows.length.toString(),
      offsetTop,
      thumbnailSize: getThumbnailHeight(rowHeight),
      firstRow: layoutRows.length === 0,
      lastRow: true,
    })
    offsetTop += Math.round(rowHeight)
  }

  return {
    rows: layoutRows,
    totalHeight: offsetTop,
  }
}

function applyScrollFromMouseY(clientY: number) {
  if (!scrollTrackEl.value || !scrollContainerEl.value) return
  const trackRect = scrollTrackEl.value.getBoundingClientRect()
  const trackTop = trackRect.top
  let newThumbY = clientY - dragStartOffsetY - trackTop
  const maxThumbTravel = trackHeight.value - thumbHeight.value
  newThumbY = Math.max(0, Math.min(newThumbY, maxThumbTravel))
  const scrollRatio = newThumbY / maxThumbTravel
  const maxScroll = contentHeight.value - containerHeight.value
  scrollContainerEl.value.scrollTop = scrollRatio * maxScroll
}

function handleMouseDown(e: MouseEvent) {
  if (!scrollTrackEl.value || !showScrollbar.value) return
  e.preventDefault()
  const trackRect = scrollTrackEl.value.getBoundingClientRect()
  const clickYRelative = e.clientY - trackRect.top
  const currentThumbY = thumbTranslateY.value
  const currentThumbH = thumbHeight.value
  const distToTop = clickYRelative - currentThumbY
  const distToBottom = clickYRelative - (currentThumbY + currentThumbH)
  if (clickYRelative >= currentThumbY && clickYRelative <= currentThumbY + currentThumbH) {
    dragStartOffsetY = clickYRelative - currentThumbY
  } else if (distToTop >= -SNAP_MARGIN && distToTop < 0) {
    dragStartOffsetY = 0
  } else if (distToBottom > 0 && distToBottom <= SNAP_MARGIN) {
    dragStartOffsetY = currentThumbH
  } else {
    dragStartOffsetY = currentThumbH / 2
    applyScrollFromMouseY(e.clientY)
  }

  isDragging = true
}

function handleFastScroll(currentY: number) {
  const scrollDelta = Math.abs(currentY - lastScrollTop)
  lastScrollTop = currentY
  console.log(scrollDelta)
  if (scrollDelta > 750) {
    if (!isScrollingFast.value) {
      isScrollingFast.value = true
    }
    stopScrollingFast()
  } else if (isScrollingFast.value && scrollDelta > 300) stopScrollingFast()
}

const onScroll = useThrottleFn((e: Event) => {
  const target = e.target as HTMLElement
  scrollTop.value = target.scrollTop
  handleFastScroll(target.scrollTop)
}, 16)

const stopScrollingFast = useDebounceFn(() => {
  isScrollingFast.value = false
}, 150)

useResizeObserver(scrollContainerEl, (entries) => {
  if (entries[0]) {
    const rect = entries[0].contentRect
    containerWidth.value = rect.width
    containerHeight.value = rect.height
  }
})
useResizeObserver(scrollTrackEl, (entries) => {
  if (entries[0]) {
    trackHeight.value = entries[0].contentRect.height
  }
})

watch([() => props.timelineItems, containerWidth], () => {
  const { rows, totalHeight } = calculateLayout(props.timelineItems, containerWidth.value)
  gridLayout.value = rows
  contentHeight.value = totalHeight
})

watch(
  () => props.timelineItems,
  () => {
    const ids = props.timelineItems.map((item) => item.id)
    viewPhotoStore.ids = ids
    selectionStore.allIds = ids
  },
  { immediate: true },
)

useEventListener(window, 'mousemove', (e: MouseEvent) => {
  if (!isDragging) return
  e.preventDefault()
  applyScrollFromMouseY(e.clientY)
})
useEventListener(window, 'mouseup', () => {
  isDragging = false
})
useEventListener(document, 'keydown', (e) => {
  if (e.key === 'a' && e.ctrlKey) {
    e.preventDefault()
    selectionStore.selectAll()
  }
  if (e.key === 'Escape' && route.name !== 'view-photo') {
    e.preventDefault()
    selectionStore.deselectAll()
  }
})
</script>

<template>
  <div class="simple-timeline">
    <main-layout-container>
      <selection-overlay />
      <teleport to="body">
        <router-view />
      </teleport>

      <div class="scroll-container" ref="scrollContainer" @scroll.passive="onScroll">
        <slot></slot>
        <div
          class="grid"
          :style="{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }"
        >
          <div
            v-for="virtualRow in rowVirtualizer.getVirtualItems()"
            :key="String(virtualRow.key)"
            :style="{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualRow.start}px)`,
            }"
          >
            <virtual-simple-row
              v-if="gridLayout[virtualRow.index]"
              :item="gridLayout[virtualRow.index]!"
              :container-width="containerWidth"
              :item-gap="ITEM_GAP"
              :is-scrolling-fast="isScrollingFast"
            />
          </div>
        </div>
      </div>
    </main-layout-container>

    <!-- Scrollbar Track -->
    <div
      class="timeline-scroll"
      ref="scrollTrack"
      @mousedown="handleMouseDown"
      v-show="showScrollbar"
    >
      <div class="scroll-track"></div>
      <div
        class="scroll-thumb"
        :style="{
          height: `${thumbHeight}px`,
          transform: `translateY(${thumbTranslateY}px)`,
        }"
      ></div>
    </div>
  </div>
</template>

<style scoped>
.simple-timeline {
  width: 100%;
  height: 100%;
  display: flex;
  --item-gap: calc(v-bind(ITEM_GAP) * 1px);
}

.scroll-container {
  height: 100%;
  width: 100%;
  overflow-y: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.scroll-container::-webkit-scrollbar {
  display: none;
}

.grid {
  border-radius: 25px;
  overflow: hidden;
}

.timeline-scroll {
  width: 50px;
  height: 100%;
  position: relative;
  cursor: pointer;
  flex-shrink: 0;
  user-select: none;
}

.scroll-track {
  background-color: rgba(var(--v-theme-on-surface), 0.08);
  width: 10px;
  height: 100%;
  position: absolute;
  right: 3px;
  top: 0;
  border-radius: 5px;
}

.scroll-thumb {
  background-color: rgb(var(--v-theme-primary));
  position: absolute;
  top: 0;
  right: 3px;
  width: 10px;
  border-radius: 5px;
  will-change: transform;
  transform: translateZ(0);
  pointer-events: none;
}
</style>
