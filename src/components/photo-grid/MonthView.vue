<script setup lang="ts">
import SuperLazy from '@/components/SuperLazy.vue'
import photoService from '@/script/services/photoService'
import type { MediaItemDto } from '@/script/types/api/photos'

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

defineProps<{
  layout: MonthLayout
  items: MediaItemDto[] | null
  photoGap: number
}>()
</script>

<template>
  <h1 class="month-title">Month {{ layout.id }}</h1>
  <super-lazy
    v-for="(row, n) in layout.rows"
    :key="n"
    :height="row.height + photoGap + 'px'"
    margin="5000px"
    class="row"
  >
<!--    <img-->
<!--      v-for="(item, j) in row.items"-->
<!--      :key="j"-->
<!--      class="item"-->
<!--      loading="lazy"-->
<!--      :src="photoService.getPhotoThumbnail(items[item.index]?.i, 240)"-->
<!--      :height="row.height"-->
<!--    />-->
    <div
      v-for="(item, j) in row.items"
      :key="j"
      class="item"
      :style="{
        width: row.height * item.ratio + 'px',
        height: row.height + 'px',
        backgroundImage: `url(${photoService.getPhotoThumbnail(items?.[item.index]?.i, 240)})`,
      }"
    ></div>
  </super-lazy>
</template>

<style scoped>
.month-title {
  padding: 20px 0 20px 15px;
  margin-left: 20px;
}
.row {
  display: flex;
  gap: 2px;
}

.item {
  background-color: rgba(255, 255, 255, 0.1);
  background-size: cover;
  content-visibility: auto;
  contain-intrinsic-size: 240px;
  contain: size layout paint;
  will-change: transform;
  transform: translateZ(0);
}
</style>
