<script setup lang="ts">
import type { AlbumTimelineItem } from '@/scripts/types/generated/timeline.ts'
import { computed, ref, shallowRef, useTemplateRef, watch } from 'vue'
import type { SimpleLayoutRow } from '@/scripts/types/timeline/layout.ts'
import { getThumbnailHeight } from '@/scripts/utils.ts'
import { useDebounceFn, useResizeObserver, useThrottleFn } from '@vueuse/core'
import { useVirtualizer } from '@tanstack/vue-virtual'
import VirtualSimpleRow from '@/vues/components/simple-timeline/VirtualSimpleRow.vue'

const props = defineProps<{
  timelineItems: AlbumTimelineItem[]
}>()

const IDEAL_ROW_HEIGHT = 240
const MAX_SIZE_MULTIPLIER = 1.5
const ITEM_GAP = 2

const gridLayout = shallowRef<SimpleLayoutRow[]>([])
const containerSize = shallowRef({ width: 0, height: 0 })
const scrollContainerEl = useTemplateRef('scrollContainer')
const currentScrollTop = ref(0)
const isScrollingFast = ref(false)
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

function calculateLayout(timelineItems: AlbumTimelineItem[], containerWidth: number) {
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

  return layoutRows
}

function rawOnScroll(e: Event) {
  const target = e.target as HTMLElement
  currentScrollTop.value = target.scrollTop
}

const onScroll = useThrottleFn(rawOnScroll, 33)

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

watch([() => props.timelineItems, containerSize], () => {
  gridLayout.value = calculateLayout(props.timelineItems, containerSize.value.width)
})

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
  overflow-y: auto;
  width: 100%;
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
</style>
