<script setup lang="ts">
import { usePhotosStore } from '@/stores/photosStore.ts'
import { useRoute } from 'vue-router'
import photosService from '@/script/services/photosService.ts'

const photosStore = usePhotosStore()
const route = useRoute()

photosStore.fetchTimelineSummary().then(async () => {
  const dateString = (
    route.query['date'] ??
    new Date().toISOString().split('T')[0] ??
    ''
  ).toString()
  const date = new Date(dateString)
  console.log('date', date)
  const monthsToFetch = photosStore.fetchMediaAroundDate(date, 100)
  if (monthsToFetch) await photosStore.fetchMediaByMonth(Array.from(monthsToFetch))
  console.log(photosStore.monthData)
})
</script>

<template>
  <div class="images">
    <div class="month" v-for="(mediaItems, month) in photosStore.monthData" :key="month">
      <div class="media-item" v-for="media in mediaItems" :key="media.i">
        <img :src="photosService.getPhotoThumbnail(media.i, 240)" alt="User photo or video." />
      </div>
    </div>
  </div>
</template>

<style scoped>
.images {
  margin: 10px;
  border-radius: 55px;
  overflow: hidden;
}
.month {
  display: inline-block;
}
.day {
  display: inline-block;
}
.media-item {
  display: inline-block;
  margin: 1px;
  margin-top: 0;
  margin-top: -5px;
}
</style>
