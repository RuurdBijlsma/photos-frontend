<script setup lang="ts">
import SuperLazy from '@/components/SuperLazy.vue'
import { usePhotoStore } from '@/stores/photoStore.ts'

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
  month: MonthLayout
  photoGap: number
}>()

const photoStore = usePhotoStore()

async function getPhotos() {
  // const now = performance.now()
  // await photoStore.fetchMediaByMonth(props.month.id)
  // console.log('fetch month photos: ', performance.now() - now, 'ms')
}

getPhotos()
</script>

<template>
  <h1 class="month-title">Month {{ month.id }}</h1>
  <super-lazy
    :height="row.height + photoGap + 'px'"
    margin="1000px"
    v-for="(row, n) in month.rows"
    :key="n"
    class="row"
  >
    <div
      class="item"
      v-for="(item, j) in row.items"
      :key="j"
      :style="{
        backgroundColor: 'black',
        width: row.height * item.ratio + 'px',
        height: row.height + 'px',
      }"
    >
      <template v-if="photoStore.months[props.month.id]">
        {{ photoStore.months[props.month.id][item.index].i }}
      </template>
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
