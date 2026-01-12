<script setup lang="ts">
import { CURRENT_YEAR, MONTHS } from '@/scripts/constants.ts'
import photoService from '@/scripts/services/photoService.ts'
import { useTimelineStore } from '@/scripts/stores/timeline/timelineStore.ts'
import type { LayoutRow } from '@/scripts/types/timeline/layout.ts'
import { computed } from 'vue'
import { useSelectionStore } from '@/scripts/stores/timeline/selectionStore.ts'
import { toHms } from '@/scripts/utils.ts'

const timelineStore = useTimelineStore()
const selectionStore = useSelectionStore()

const props = defineProps<{
  item: LayoutRow
  containerWidth: number
  itemGap: number
}>()

const monthItems = computed(() => timelineStore.monthItems.get(props.item.monthId) ?? [])

function selectItem(e: PointerEvent) {
  console.log('select', e)
  const target = e.target as HTMLElement
  const itemElement = target.closest('.virtual-scroll-item') as HTMLElement
  const id = itemElement.dataset['id'] as string
  if (e.shiftKey) {
    selectionStore.selectSpan(id)
  } else {
    selectionStore.toggleSelection(id)
  }
}

function videoMouseEnter(e: MouseEvent) {
  const target = e.target as HTMLVideoElement
  target.play()
}

function videoMouseLeave(e: MouseEvent) {
  const target = e.target as HTMLVideoElement
  target.pause()
}
</script>

<template>
  <div style="width: 100%">
    <div class="row-date-header" v-if="item.firstOfTheMonth">
      <h2>{{ MONTHS[item.date.getMonth()] }}</h2>
      <h3 v-if="item.date.getFullYear() !== CURRENT_YEAR">
        {{ item.date.getFullYear() }}
      </h3>
    </div>
    <div
      :class="{
        'first-of-the-month-row': item.firstOfTheMonth,
        'last-of-the-month-row': item.lastOfTheMonth,
      }"
      class="virtual-scroll-row"
      :style="{
        height: `${Math.round(item.height)}px`,
        width: `${containerWidth}px`,
        marginBottom: item.lastOfTheMonth ? '0px' : `${itemGap}px`,
      }"
    >
      <div
        @click.prevent="selectItem"
        v-for="mediaItem in item.items"
        :key="mediaItem.index"
        :data-id="monthItems[mediaItem.index]?.id"
        class="virtual-scroll-item"
        :class="{
          selected: selectionStore.selection.has(monthItems[mediaItem.index]?.id!),
        }"
        :style="{
          backgroundImage: `url(${photoService.getPhotoThumbnail(monthItems[mediaItem.index]?.id, item.thumbnailSize)})`,
          width: `${Math.round(mediaItem.ratio * item.height)}px`,
          height: `${Math.round(item.height)}px`,
          '--scale-x': (mediaItem.ratio * item.height - 8) / (mediaItem.ratio * item.height),
          '--scale-y': (item.height - 8) / item.height,
        }"
      >
        <video
          muted
          @mouseenter="videoMouseEnter"
          @mouseleave="videoMouseLeave"
          :width="Math.round(mediaItem.ratio * item.height)"
          :height="Math.round(item.height)"
          v-if="monthItems[mediaItem.index]?.isVideo"
          :src="photoService.getVideo(monthItems[mediaItem.index]?.id, 480)"
        />
        <div class="checkbox">
          <v-icon color="secondary" class="check-item" size="15" icon="mdi-check-bold"></v-icon>
        </div>
        <router-link
          class="fullscreen"
          :to="`/view/${monthItems[mediaItem.index]?.id}`"
          title="View in fullscreen"
        >
          <v-icon color="white" class="fullscreen-icon" size="20" icon="mdi-fullscreen" />
        </router-link>
        <div class="video-info" v-if="monthItems[mediaItem.index]?.isVideo">
          <span>{{ toHms(monthItems[mediaItem.index]?.durationMs! / 1000) }}</span>
          <div class="is-video">
            <v-icon color="white" class="is-video-icon" size="15" icon="mdi-play" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.virtual-scroll-row {
  display: flex;
  gap: var(--item-gap);
  overflow: hidden;
}

.first-of-the-month-row {
  border-top-left-radius: 25px;
  border-top-right-radius: 25px;
}

.last-of-the-month-row {
  border-bottom-left-radius: 25px;
  border-bottom-right-radius: 25px;
}

.row-date-header {
  padding: 20px 30px;
  display: flex;
  align-items: flex-end;
}

.row-date-header h2 {
  font-size: 24px;
  font-weight: 600;
}

.row-date-header h3 {
  font-size: 18px;
  font-weight: 400;
  opacity: 0.7;
  margin-left: 20px;
  padding-bottom: 1px;
}

.virtual-scroll-item {
  flex: 0 0 auto;
  background-color: rgba(255, 255, 255, 0.05);
  background-position: center;
  background-repeat: no-repeat;
  background-size: cover;
  position: relative;
  cursor: pointer;
  transition: transform 0.2s ease-in-out;
}

.virtual-scroll-item.selected {
  overflow: hidden;
  border-radius: 20px;
  box-shadow:
    inset 0 0 0 1.5px rgba(var(--v-theme-secondary), 1),
    0 0 0 4px rgba(var(--v-theme-secondary), 0.4);
  transform: scale(var(--scale-x), var(--scale-y));
}

.virtual-scroll-item.selected video {
  width: calc(100% - 2px);
  height: calc(100% - 2px);
  border-radius: 20px;
  position: absolute;
  top: 1px;
  left: 1px;
}

.checkbox {
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

.virtual-scroll-item.selected .checkbox {
  background-color: rgba(var(--v-theme-background), 0.3);
}

.check-item {
  display: none;
  transform: translateY(-2px);
}

.virtual-scroll-item.selected .check-item,
.checkbox:hover .check-item {
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

.video-info {
  position: absolute;
  top: 10px;
  right: 10px;
  display: flex;
  gap: 10px;
  align-items: center;
}

.video-info span {
  font-weight: 500;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
}

.is-video {
  width: 25px;
  height: 25px;
  border-radius: 50%;
  display: flex;
  box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.8);
  justify-content: center;
  align-items: center;
}
</style>
