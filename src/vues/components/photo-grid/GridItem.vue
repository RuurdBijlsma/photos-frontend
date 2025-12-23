<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import photoService from '@/scripts/services/photoService.ts'
import { useMediaStore } from '@/scripts/stores/mediaStore.ts'
import { useSelectionStore } from '@/scripts/stores/selectionStore.ts'
import type { TimelineItem } from '@/scripts/types/generated/timeline.ts'

export type SelectionPayload = { event: PointerEvent; id: string }

const props = defineProps<{
  mediaItem?: TimelineItem
  thumbnailHeight: number
  height: number
  width: number
  isPreviewAdd?: boolean
  isPreviewRemove?: boolean
}>()

const emit = defineEmits<{ (e: 'selectionClick', payload: SelectionPayload): void }>()

const route = useRoute()
const router = useRouter()
const mediaStore = useMediaStore()
const selectionStore = useSelectionStore()

const itemId = computed(() => props.mediaItem?.id ?? '')
const isSelected = computed(() => selectionStore.isSelected(itemId.value))
const isSelectionMode = computed(() => selectionStore.size > 0)

const thumbnail = computed(() => {
  return itemId.value ? photoService.getPhotoThumbnail(itemId.value, props.thumbnailHeight) : ''
})
const linkUrl = computed(() =>
  itemId.value ? `${route.path === '/' ? '' : route.path}/view/${itemId.value}` : '#',
)

const checkIcon = computed(() =>
  isSelected.value || !isSelectionMode.value
    ? 'mdi-check-circle'
    : 'mdi-checkbox-blank-circle-outline',
)

const containerStyle = computed(() => {
  const { width, height } = props
  if (!width || !height) return {}

  return {
    '--scale-x': (width - 8) / width,
    '--scale-y': (height - 8) / height,
    width: `${width}px`,
    height: `${height}px`,
    containIntrinsicWidth: `${width}px`,
    containIntrinsicHeight: `${height}px`,
  }
})

function emitSelection(e: Event) {
  if (itemId.value) emit('selectionClick', { event: e as PointerEvent, id: itemId.value })
}

function handleLinkClick(e: MouseEvent) {
  if (e.button === 1) return // Ignore middle click
  e.preventDefault()

  if (isSelectionMode.value) {
    emitSelection(e)
  } else {
    router.push(linkUrl.value)
  }
}

function handleSelectionClick(e: MouseEvent) {
  e.preventDefault()
  e.stopPropagation()
  emitSelection(e)
}

function handlePointerDown() {
  if (itemId.value) mediaStore.fetchItem(itemId.value)
}
</script>

<template>
  <div class="grid-cell-container" :style="containerStyle">
    <a
      :href="linkUrl"
      class="grid-item-link"
      draggable="false"
      @click="handleLinkClick"
      @pointerdown="handlePointerDown"
    >
      <div
        class="visual-content"
        :class="{
          selected: isSelected,
          'preview-add': isPreviewAdd,
          'preview-remove': isPreviewRemove,
        }"
        :style="{ backgroundImage: `url(${thumbnail})` }"
      >
        <div class="check-icon" @click="handleSelectionClick">
          <svg viewBox="0 0 24 24" class="icon-svg">
            <path
              v-if="checkIcon === 'mdi-check-circle'"
              fill="currentColor"
              d="M12 2C6.5 2 2 6.5 2 12S6.5 22 12 22 22 17.5 22 12 17.5 2 12 2M10 17L5 12L6.41 10.59L10 14.17L17.59 6.58L19 8L10 17Z"
            />
            <path
              v-else
              fill="currentColor"
              d="M12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"
            />
          </svg>
        </div>

        <button
          class="magnify-button"
          tabindex="-1"
          @click.stop.prevent="router.push(linkUrl)"
          :title="`View ${props.mediaItem?.isVideo ? 'video' : 'photo'}`"
        >
          <svg viewBox="0 0 24 24" class="icon-svg-small">
            <path
              fill="currentColor"
              d="M5,5H10V7H7V10H5V5M14,5H19V10H17V7H14V5M17,14H19V19H14V17H17V14M10,17V19H5V14H7V17H10Z"
            />
          </svg>
        </button>
      </div>
    </a>
  </div>
</template>

<style scoped>
.grid-cell-container {
  transform: translateZ(0);
}

.grid-item-link {
  display: block;
  width: 100%;
  height: 100%;
  user-select: none;
  -webkit-user-drag: none;
}

.visual-content {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background-position: center;
  background-repeat: no-repeat;
  background-size: cover;
  transition:
    transform 0.15s ease-out,
    border-radius 0.15s ease-out,
    box-shadow 0.15s ease-out;
}

/* Overlays (Preview & Selection) */
.visual-content::after {
  position: absolute;
  z-index: 1;
  inset: 0;
  pointer-events: none;
  content: '';
  opacity: 0;
  transition: opacity 0.2s ease-in-out;
}

.visual-content.preview-add::after {
  background-color: rgba(var(--v-theme-secondary), 0.4);
  opacity: 1;
}

.visual-content.preview-remove::after {
  background-color: rgba(var(--v-theme-error), 0.4);
  opacity: 1;
}

.visual-content.selected {
  overflow: visible;
  border-radius: 20px;
  box-shadow:
    inset 0 0 0 1.5px rgba(var(--v-theme-secondary), 1),
    0 0 0 4px rgba(var(--v-theme-secondary), 0.4);
  transform: scale(var(--scale-x), var(--scale-y));
}

.visual-content.selected::after {
  border-radius: 20px;
}

/* Icons & Interactivity */
.magnify-button {
  position: absolute;
  right: 10px;
  bottom: 10px;
  z-index: 2;
  width: 25px;
  height: 25px;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.15s ease;
  background-color: rgb(var(--v-theme-secondary));
  border-radius: 50%;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: rgb(var(--v-theme-on-secondary));
  padding: 0;
}

.is-selecting .visual-content:hover .magnify-button {
  opacity: 1;
  pointer-events: auto;
}

.check-icon {
  position: absolute;
  top: 10px;
  right: 8px;
  z-index: 2;
  display: flex;
  cursor: pointer;
  opacity: 0;
  pointer-events: none;
  color: rgb(var(--v-theme-secondary));
  width: 28px;
  height: 28px;
}

.icon-svg {
  width: 100%;
  height: 100%;
}

.icon-svg-small {
  width: 15px;
  height: 15px;
}

.check-icon:hover {
  opacity: 1 !important;
}

/* Check Icon Visibility Logic */
.visual-content.selected .check-icon,
.is-selecting .check-icon,
.visual-content:hover .check-icon {
  opacity: 1;
  pointer-events: auto;
}

.photo-grid-container:not(.is-selecting) .visual-content:not(.selected):hover .check-icon {
  opacity: 0.7;
}
</style>
