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
  (e: 'hoverItem', date: Date | null): void
  (e: 'selectionClick', payload: SelectionPayload): void
}>()

defineProps<{
  row: RowLayout
  photoGap: number
  mediaItems?: TimelineItem[]
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
    <!-- 3. Pass the payload directly up to the parent -->
    <grid-item
      @mouseenter="
        emit(
          'hoverItem',
          mediaItems?.[ratio.index]?.timestamp === undefined
            ? null // @ts-expect-error date handling
            : new Date(mediaItems?.[ratio.index]?.timestamp),
        )
      "
      @mouseleave="emit('hoverItem', null)"
      v-for="ratio in row.items"
      :key="ratio.index"
      :media-item="mediaItems?.[ratio.index]"
      :height="row.height"
      :width="row.height * ratio.ratio"
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
