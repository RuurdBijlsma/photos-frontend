<script setup lang="ts">
import type { SimpleLayoutRow } from '@/scripts/types/timeline/layout.ts'
import ReorderGridItem from './ReorderGridItem.vue'
import { ref } from 'vue'

defineProps<{
  item: SimpleLayoutRow
  containerWidth: number
  itemGap: number
}>()

const emit = defineEmits(['reorder'])

const dropTargetId = ref<string | null>(null)
const dropPosition = ref<'before' | 'after' | null>(null)

function onDragOver(e: DragEvent, targetId: string) {
  e.preventDefault()
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'

  const target = e.currentTarget as HTMLElement
  const rect = target.getBoundingClientRect()
  const x = e.clientX - rect.left

  dropTargetId.value = targetId
  dropPosition.value = x < rect.width / 2 ? 'before' : 'after'
}

function onDragLeave() {
  dropTargetId.value = null
  dropPosition.value = null
}

function onDrop(e: DragEvent, targetId: string) {
  e.preventDefault()
  const sourceId = e.dataTransfer?.getData('text/plain')
  if (!sourceId || sourceId === targetId) {
    onDragLeave()
    return
  }

  emit('reorder', {
    sourceId,
    targetId,
    position: dropPosition.value,
  })

  onDragLeave()
}
</script>

<template>
  <div
    class="reorder-grid-row"
    :style="{
      height: `${Math.round(item.height)}px`,
      width: `${containerWidth}px`,
      marginBottom: `${itemGap}px`,
    }"
  >
    <div
      v-for="mediaItem in item.items"
      :key="mediaItem.id"
      class="item-wrapper"
      @dragover="onDragOver($event, mediaItem.id)"
      @dragleave="onDragLeave"
      @drop="onDrop($event, mediaItem.id)"
      :class="{
        'drop-before': dropTargetId === mediaItem.id && dropPosition === 'before',
        'drop-after': dropTargetId === mediaItem.id && dropPosition === 'after',
      }"
    >
      <reorder-grid-item
        :media-item="mediaItem"
        :width="Math.round(mediaItem.ratio * item.height)"
        :height="Math.round(item.height)"
        :thumbnail-size="item.thumbnailSize"
      />
      <div class="insertion-line"></div>
    </div>
  </div>
</template>

<style scoped>
.reorder-grid-row {
  display: flex;
  gap: var(--item-gap);
  overflow: hidden;
}

.item-wrapper {
  position: relative;
}

.insertion-line {
  position: absolute;
  top: 10%;
  height: 80%;
  width: 4px;
  background-color: rgb(var(--v-theme-primary));
  border-radius: 2px;
  opacity: 0;
  transition: opacity 0.2s;
  pointer-events: none;
  z-index: 10;
}

.drop-before .insertion-line {
  left: -2px;
  opacity: 1;
}

.drop-after .insertion-line {
  right: -2px;
  opacity: 1;
}
</style>
