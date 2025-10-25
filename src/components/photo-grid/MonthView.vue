<script setup lang="ts">
import SuperLazy from '@/components/SuperLazy.vue'
import photoService from '@/script/services/photoService.ts'
import { usePhotoStore } from '@/stores/photoStore.ts'
import type { MediaItemDto } from '@/script/types/api/photos.ts'

export interface LayoutItem {
  ratio: number
  index: number
}

export interface RowLayout {
  items: LayoutItem[]
  height: number
}

export interface MonthLayout {
  id: string
  height: number
  rows: RowLayout[]
}

const props = defineProps<{
  layout: MonthLayout
  items: MediaItemDto[] | null
  photoGap: number
}>()

const photoStore = usePhotoStore()
</script>

<template>
  <h1 class="month-title">Month {{ layout.id }}</h1>
  <super-lazy
    :height="row.height + photoGap + 'px'"
    margin="5000px"
    v-for="(row, n) in layout.rows"
    :key="n"
    class="row"
  >
    <div
      class="item"
      v-for="(item, j) in row.items"
      :key="j"
      :style="{
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        width: row.height * item.ratio + 'px',
        height: row.height + 'px',
        backgroundImage: items?.[item.index]?.i ? `url(${photoService.getPhotoThumbnail(items[item.index]?.i ?? 'img/placeholder.svg', 240)})` : 'none',
      }"
    >
    </div>
  </super-lazy>
</template>

<style scoped>
.row {
  display: flex;
  gap: 2px;
}

.month-title {
  padding: 20px 0 20px 15px;
  margin-left: 20px;
}
</style>
