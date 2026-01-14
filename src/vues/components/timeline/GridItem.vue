<script setup lang="ts">
import type { TimelineItem } from '@/scripts/types/generated/timeline.ts'
import { toHms } from '@/scripts/utils.ts'
import { useSelectionStore } from '@/scripts/stores/timeline/selectionStore.ts'
import photoService from '@/scripts/services/photoService.ts'
import { computed, nextTick, ref } from 'vue'

const props = defineProps<{
  mediaItem: TimelineItem | undefined
  width: number
  height: number
  thumbnailSize: number
  isScrollingFast: boolean
}>()

const selectionStore = useSelectionStore()

const id = computed(() => props.mediaItem?.id ?? null)
const isVideo = computed(() => props.mediaItem?.isVideo ?? false)
const durationMs = computed(() => props.mediaItem?.durationMs ?? 0)
const videoMount = ref(false)
const hovering = ref(false)

function mouseEnter(e: MouseEvent) {
  selectionStore.hoverDate = props.mediaItem?.timestamp ?? null
  hovering.value = true
  if (!isVideo.value) return
  nextTick(() => {
    const target = e.target as HTMLElement
    const item = target.closest('.virtual-scroll-item') as HTMLElement
    const video = item.querySelector('video') as HTMLVideoElement
    if (video?.paused) video?.play()
  })
}

function mouseLeave(e: MouseEvent) {
  selectionStore.hoverDate = null
  hovering.value = false
  if (!isVideo.value) return
  const target = e.target as HTMLElement
  const item = target.closest('.virtual-scroll-item') as HTMLElement
  const video = item.querySelector('video') as HTMLVideoElement
  if (!video?.paused) video?.pause()
  if ((video?.currentTime ?? 0) > 1) {
    videoMount.value = true
  }
}

function selectItem(e: PointerEvent) {
  const itemId = id.value
  if (!itemId) return
  if (e.shiftKey) {
    selectionStore.selectSpan(itemId)
  } else {
    selectionStore.toggleSelection(itemId)
  }
}
</script>

<template>
  <div
    class="virtual-scroll-item"
    :data-id="id"
    :class="{
      selected: selectionStore.selection.has(id!),
    }"
    :style="{
      width: `${width}px`,
      height: `${height}px`,
      backgroundImage: `url(${photoService.getPhotoThumbnail(id, thumbnailSize)})`,
      '--scale-x': (width - 8) / width,
      '--scale-y': (height - 8) / height,
    }"
  >
    <template v-if="!isScrollingFast">
      <video
        v-if="isVideo && (videoMount || hovering)"
        class="video-content"
        autoplay
        muted
        loop
        playsinline
        :width="width"
        :height="height"
        :src="photoService.getVideo(id, 480)"
      />

      <div v-if="selectionStore.isSelecting" class="selecting-overlay" @click="selectItem">
        <div class="checkbox-selecting">
          <v-icon
            color="secondary"
            class="check-item-selecting"
            size="15"
            icon="mdi-check-bold"
          ></v-icon>
        </div>
        <router-link class="fullscreen" :to="`/view/${id}`" title="View in fullscreen" @click.stop>
          <v-icon color="white" class="fullscreen-icon" size="20" icon="mdi-fullscreen" />
        </router-link>
        <div class="video-events" @mouseenter="mouseEnter" @mouseleave="mouseLeave" />
      </div>

      <template v-else>
        <router-link class="view-link" :to="`/view/${id}`">
          <div class="video-events" @mouseenter="mouseEnter" @mouseleave="mouseLeave" />
        </router-link>
        <div class="checkbox" @click.prevent="selectItem">
          <v-icon color="secondary" class="check-item" size="15" icon="mdi-check-bold" />
        </div>
      </template>

      <div class="video-info" v-if="isVideo">
        <span>{{ toHms(durationMs / 1000) }}</span>
        <div class="video-icon">
          <v-icon color="white" class="is-video-icon" size="15" icon="mdi-play" />
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.virtual-scroll-item {
  flex: 0 0 auto;
  background-color: rgba(255, 255, 255, 0.05);
  position: relative;
  background-position: center;
  background-repeat: no-repeat;
  background-size: cover;
}

.virtual-scroll-item.selected {
  overflow: hidden;
  border-radius: 20px;
  box-shadow:
    inset 0 0 0 1.5px rgba(var(--v-theme-secondary), 1),
    0 0 0 4px rgba(var(--v-theme-secondary), 0.4);
  transform: scale(var(--scale-x), var(--scale-y));
}

.video-content {
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
}

.checkbox-selecting {
  position: absolute;
  top: 10px;
  left: 10px;
  width: 25px;
  height: 25px;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  box-shadow: inset 0 0 0 2px rgb(var(--v-theme-secondary));
}

.virtual-scroll-item.selected .checkbox-selecting {
  background-color: rgba(var(--v-theme-background), 0.3);
}

.check-item-selecting {
  display: none;
  transform: translateY(-2px);
}

.selecting-overlay {
  height: 100%;
  cursor: pointer;
}

.virtual-scroll-item.selected .check-item-selecting,
.checkbox:hover .check-item-selecting {
  display: block;
}

.fullscreen {
  position: absolute;
  bottom: 10px;
  left: 10px;
  width: 25px;
  height: 25px;
  border-radius: 50%;
  display: none;
  justify-content: center;
  align-items: center;
  transition: scale 0.2s ease-in-out;
  text-decoration: none;
  background-color: rgb(var(--v-theme-surface));
}

.fullscreen:hover {
  transform: scale(1.2);
}

.fullscreen:active {
  transform: scale(1.5);
}

.virtual-scroll-item:hover .fullscreen {
  display: flex;
}

.fullscreen-icon {
  color: rgb(var(--v-theme-on-secondary));
}

.checkbox {
  position: absolute;
  top: 10px;
  left: 10px;
  width: 25px;
  height: 25px;
  border-radius: 50%;
  display: none;
  box-shadow: inset 0 0 0 2px rgb(var(--v-theme-secondary));
  justify-content: center;
  align-items: center;
  cursor: pointer;
}

.virtual-scroll-item:hover .checkbox {
  display: flex;
}

.check-item {
  display: none;
  transform: translateY(-2px);
}

.checkbox:hover .check-item {
  display: block;
}

.view-link {
  position: absolute;
  width: 100%;
  height: 100%;
  pointer-events: auto;
}

.video-events {
  width: 100%;
  height: 100%;
}

.video-info {
  position: absolute;
  top: 10px;
  right: 10px;
  display: flex;
  gap: 10px;
  align-items: center;
  pointer-events: none;
}

.video-info span {
  font-weight: 500;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
}

.video-icon {
  width: 25px;
  height: 25px;
  border-radius: 50%;
  display: flex;
  box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.8);
  justify-content: center;
  align-items: center;
}
</style>
