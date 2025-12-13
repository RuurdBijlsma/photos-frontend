<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import photoService from '@/scripts/services/photoService.ts'
import { useMediaStore } from '@/scripts/stores/mediaStore.ts'
import { useSelectionStore } from '@/scripts/stores/selectionStore.ts'
import type { TimelineItem } from '@/scripts/types/generated/timeline.ts'

export type SelectionPayload = { event: PointerEvent; id: string }

const props = defineProps<{
  mediaItem?: TimelineItem
  height: number
  width: number
  isPreviewAdd?: boolean
  isPreviewRemove?: boolean
}>()

const emit = defineEmits<{ (e: 'selectionClick', payload: SelectionPayload): void }>()

const router = useRouter()
const mediaStore = useMediaStore()
const selectionStore = useSelectionStore()

const itemId = computed(() => props.mediaItem?.id ?? '')
const isSelected = computed(() => selectionStore.isSelected(itemId.value))
const isSelectionMode = computed(() => selectionStore.size > 0)

const thumbnail = computed(() =>
  itemId.value ? photoService.getPhotoThumbnail(itemId.value, 240) : '',
)
const linkUrl = computed(() => (itemId.value ? `/view/${itemId.value}` : '#'))

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
  <div
    class="grid-cell-container"
    v-memo="[isSelected, isSelectionMode, thumbnail, width, height, isPreviewAdd, isPreviewRemove]"
    :style="containerStyle"
  >
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
        <v-icon
          class="check-icon"
          color="secondary"
          :size="28"
          :icon="checkIcon"
          @click="handleSelectionClick"
        />

        <v-btn
          icon
          color="secondary"
          variant="flat"
          class="magnify-button"
          tabindex="-1"
          :to="linkUrl"
          @click.stop
        >
          <v-icon
            size="15"
            icon="mdi-fullscreen"
            :title="`View ${props.mediaItem?.isVideo ? 'video' : 'photo'}`"
          />
        </v-btn>
      </div>
    </a>
  </div>
</template>

<style scoped>
.grid-cell-container {
  contain: strict;
  content-visibility: auto;
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
  will-change: transform, box-shadow;
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
