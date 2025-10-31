<script setup lang="ts">
import GridItem from '@/components/photo-grid/GridItem.vue'
import type { MediaItem } from '@/generated/photos.ts'

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
}

const emit = defineEmits(['hoverItem'])

defineProps<{
  row: RowLayout
  photoGap: number
  mediaItems?: MediaItem[]
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
      height: row.height + photoGap + 'px'
    }"
  >
    <grid-item
      @mouseenter="
        emit(
          'hoverItem',
          mediaItems?.[ratio.index]?.timestamp === undefined
            ? null
            : new Date(mediaItems?.[ratio.index]?.timestamp),
        )
      "
      @mouseleave="emit('hoverItem', null)"
      v-for="ratio in row.items"
      :key="ratio.index"
      :media-item="mediaItems?.[ratio.index]"
      :height="row.height"
      :width="row.height * ratio.ratio"
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
