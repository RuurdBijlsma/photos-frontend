<script setup lang="ts">
import { useRoute } from 'vue-router'
import { usePhotoStore } from '@/stores/photoStore.ts'

const photoStore = usePhotoStore()
const route = useRoute()

const id = route.params.id
photoStore.fetchMedia(id).then(() => {
  console.log('DONE')
})
console.log('PHOTO VIEW ID', id)
</script>

<template>
  <div class="photo-view">
    <div class="photo"></div>
  </div>
</template>

<style scoped>
.photo-view {
  position: fixed;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  background-color: black;
  z-index: 2400;
}

.photo {
  width: 100%;
  height: 100%;
  background-size: contain;
}
</style>
