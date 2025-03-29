<script setup lang="ts">
import { scheme } from '@/plugins/vuetify'

defineProps<{
  text: string
  captionText: boolean
}>()
</script>

<template>
  <div class="title-box">
    <div class="left-title">
      <div class="big-image"></div>
    </div>
    <div class="right-title">
      <h1 :style="{ color: scheme.on_surface_variant }">
        Set Up <span>Ruurd Photos</span>
      </h1>
      <p
        class="mt-2"
        :class="{
          'text-caption': captionText,
        }"
        :style="{ color: scheme.on_surface_variant }"
        v-text="text"
      />
    </div>
  </div>

  <v-divider class="mt-10 mb-5" />
</template>

<style scoped>
.title-box {
  display: flex;
  gap: 40px;
}

.big-image {
  background-image: url('img/app-no-bg-1024.png');
  width: 100px;
  height: 100px;
  background-size: 90%;
  background-position: center;
}

.right-title {
  height: 100px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.title-box h1 {
  font-size: 35px;
  font-weight: 400;
  opacity: 0.9;
}

.title-box span {
  font-weight: 600;
}
</style>
