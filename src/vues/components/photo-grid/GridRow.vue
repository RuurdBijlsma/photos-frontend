<script setup lang="ts">
import GridItem, { type SelectionPayload } from '@/vues/components/photo-grid/GridItem.vue'
import type { TimelineItem } from '@/scripts/types/generated/timeline.ts'

export interface LayoutItem {
  ratio: number
  index: number
}

export interface RowLayout {
  items: LayoutItem[]
  monthId: string
  height: number
  firstOfTheMonth: boolean
  lastOfTheMonth: boolean
  key: string
}

const emit = defineEmits<{
  (e: 'hoverItem', payload: { date: Date | null; id: string | null }): void
  (e: 'selectionClick', payload: SelectionPayload): void
}>()

defineProps<{
  row: RowLayout
  photoGap: number
  mediaItems?: TimelineItem[]
  previewAddIds: Set<string>
  previewRemoveIds: Set<string>
}>()
</script>

<template>
  <div
    class="row"
    :class="{
      'top-row': row.firstOfTheMonth,
      'bottom-row': row.lastOfTheMonth,
    }"
    :style="{
      height: row.height + photoGap + 'px',
    }"
  >
    <grid-item
      @mouseenter="
        emit('hoverItem', {
          date:
            mediaItems?.[layoutItem.index]?.timestamp === undefined
              ? null
              : new Date(mediaItems?.[layoutItem.index]?.timestamp!),
          id: mediaItems?.[layoutItem.index]?.id ?? null,
        })
      "
      @mouseleave="emit('hoverItem', { date: null, id: null })"
      v-for="layoutItem in row.items"
      :key="layoutItem.index"
      :media-item="mediaItems?.[layoutItem.index]"
      :height="row.height"
      :width="row.height * layoutItem.ratio"
      :is-preview-add="
        mediaItems?.[layoutItem.index]?.id
          ? previewAddIds.has(mediaItems[layoutItem.index]!.id)
          : false
      "
      :is-preview-remove="
        mediaItems?.[layoutItem.index]?.id
          ? previewRemoveIds.has(mediaItems[layoutItem.index]!.id)
          : false
      "
      @selection-click="(payload) => emit('selectionClick', payload)"
    />
  </div>
</template>

<style scoped>
.row {
  display: flex;
  gap: v-bind(photoGap + 'px');
  overflow: hidden;
  --row-radius: 20px;
}

.top-row {
  border-top-right-radius: var(--row-radius);
  border-top-left-radius: var(--row-radius);
  overflow: hidden;
}

.bottom-row {
  border-bottom-right-radius: var(--row-radius);
  border-bottom-left-radius: var(--row-radius);
}
</style>
