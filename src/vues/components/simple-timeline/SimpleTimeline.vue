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
const MIN_SCROLL_THUMB_HEIGHT = 20

const gridLayout = shallowRef<SimpleLayoutRow[]>([])
const containerSize = shallowRef({ width: 0, height: 0 })
const scrollTrackHeight = shallowRef(0)
const scrollHeight = ref(0)
const scrollContainerEl = useTemplateRef('scrollContainer')
const scrollTrackEl = useTemplateRef('scrollTrack')
const scrollThumbEl = useTemplateRef('scrollThumb')
const currentScrollTop = ref(0)
const isScrollingFast = ref(false)
const scrollThumbHeight = computed(() => {
  if (scrollHeight.value === 0) return 20
  return Math.max(
    (scrollTrackHeight.value * containerSize.value.height) / scrollHeight.value,
    MIN_SCROLL_THUMB_HEIGHT,
  )
})
const scrollPercentage = computed(() => {
  if (scrollHeight.value <= containerSize.value.height) return 0
  const maxScrollTop = scrollHeight.value - containerSize.value.height
  return Math.min(1, Math.max(0, currentScrollTop.value / maxScrollTop))
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
const thumbTranslateY = computed(() => {

  return Math.min(
    scrollTrackHeight.value - scrollThumbHeight.value,
    Math.max(0, scrollPercentage.value * scrollTrackHeight.value),
  )
})

let isScrollDragging = false
let scrollThumbDownPoint = 0

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

function updateScrollPosition(clientY: number) {
  if (!scrollTrackEl.value || !scrollContainerEl.value || !isScrollDragging) return
  const trackRect = scrollTrackEl.value.getBoundingClientRect()
  const trackHeight = trackRect.height
  const relativeY = Math.max(
    0,
    Math.min(trackHeight, clientY - scrollThumbDownPoint - trackRect.top),
  )
  const percentage = relativeY / trackHeight
  const maxScrollTop = scrollHeight.value - containerSize.value.height
  if (maxScrollTop > 0) {
    const newScrollTop = percentage * maxScrollTop
    scrollContainerEl.value.scrollTop = newScrollTop
    currentScrollTop.value = newScrollTop
  }
}

function rawOnScroll(e: Event) {
  const target = e.target as HTMLElement
  scrollHeight.value = target.scrollHeight
  currentScrollTop.value = target.scrollTop
}

const onScroll = useThrottleFn(rawOnScroll, 33)

function handleMouseDown(e: MouseEvent) {
  e.preventDefault()
  isScrollDragging = true
  const ste = scrollThumbEl.value
  if (ste !== null) {
    const thumbRect = ste.getBoundingClientRect()
    let thumbDownPoint = e.clientY - thumbRect.top
    const missMargin = 20
    if (thumbDownPoint < 0 && thumbDownPoint > -missMargin) {
      thumbDownPoint = 0
    } else if (
      thumbDownPoint > thumbRect.height &&
      thumbDownPoint < thumbRect.height + missMargin
    ) {
      thumbDownPoint = thumbRect.height
    } else if (thumbDownPoint > thumbRect.height || thumbDownPoint < 0) {
      thumbDownPoint = thumbRect.height / 2
    }
    scrollThumbDownPoint = thumbDownPoint
  }
  updateScrollPosition(e.clientY)
}

const stopScrollingFast = useDebounceFn(() => {
  isScrollingFast.value = false
}, 150)

useResizeObserver(scrollContainerEl, (entries) => {
  if (entries[0]) {
    const contentRect = entries[0].contentRect
    containerSize.value = {
      width: contentRect.width,
      height: contentRect.height,
    }
  }
})

useResizeObserver(scrollTrackEl, (entries) => {
  if (entries[0]) scrollTrackHeight.value = entries[0].contentRect.height
})

useEventListener(document, 'mousemove', (e) => {
  if (!isScrollDragging) return
  updateScrollPosition(e.clientY)
})

useEventListener(document, 'mouseup', (e) => {
  isScrollDragging = false
  updateScrollPosition(e.clientY)
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

watch([() => props.timelineItems, containerSize], () => {
  const { rows, totalHeight } = calculateLayout(props.timelineItems, containerSize.value.width)
  gridLayout.value = rows
  scrollHeight.value = totalHeight
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

watch(currentScrollTop, (newVal, oldVal) => {
  const scrollDelta = Math.abs(newVal - oldVal)
  if (scrollDelta > 750) {
    if (!isScrollingFast.value) {
      isScrollingFast.value = true
    }
    stopScrollingFast()
  } else if (isScrollingFast.value && scrollDelta > 300) stopScrollingFast()
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
              :container-width="containerSize.width"
              :item-gap="ITEM_GAP"
              :is-scrolling-fast="isScrollingFast"
            />
          </div>
        </div>
      </div>
    </main-layout-container>
    <div class="timeline-scroll" ref="scrollTrack" @mousedown="handleMouseDown">
      <div class="scroll-track"></div>
      <div
        class="scroll-thumb"
        ref="scrollThumb"
        :style="{
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
}

.scroll-track {
  background-color: rgba(var(--v-theme-on-surface), 0.08);
  width: 10px;
  height: 100%;
  position: absolute;
  right: 3px;
  top: 0;
  pointer-events: none;
}

.scroll-thumb {
  background-color: rgb(var(--v-theme-primary));
  position: absolute;
  top: 0;
  right: 3px;
  width: 10px;
  border-radius: 5px;
  height: calc(v-bind(scrollThumbHeight) * 1px);
}

.scroll-thumb {
  will-change: transform;
  transform: translateZ(0);
  backface-visibility: hidden;
  pointer-events: none;
}
</style>
