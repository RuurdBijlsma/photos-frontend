<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import photoService from '@/scripts/services/photoService.ts'
import { useMediaStore } from '@/scripts/stores/mediaStore.ts'
import { useSelectionStore } from '@/scripts/stores/selectionStore.ts'
import type { TimelineItem } from '@/scripts/types/generated/timeline.ts'

const mediaStore = useMediaStore()
const selectionStore = useSelectionStore()
const router = useRouter()

export type SelectionPayload = { event: PointerEvent; id: string }
const emit = defineEmits<{ (e: 'selectionClick', payload: SelectionPayload): void }>()

const props = defineProps<{
  mediaItem?: TimelineItem
  height: number
  width: number
}>()

const id = computed(() => props.mediaItem?.id ?? '')

const isSelected = computed(() => selectionStore.isSelected(id.value))
const isSelectionMode = computed(() => selectionStore.size > 0)

const thumbnail = computed(() => (id.value ? photoService.getPhotoThumbnail(id.value, 240) : ''))
const linkUrl = computed(() => (id.value ? `/view/${id.value}` : '#'))

const EMPTY_STYLE = Object.freeze({})

const scaleStyle = computed(() => {
  const { width, height } = props
  if (!width || !height) return EMPTY_STYLE

  return {
    '--scale-x': (width - 8) / width,
    '--scale-y': (height - 8) / height,
    width: width + 'px',
    height: height + 'px',
    containIntrinsicWidth: width + 'px',
    containIntrinsicHeight: height + 'px',
  }
})

function handleLinkClick(e: MouseEvent) {
  if (e.button === 1) return

  e.preventDefault()
  if (selectionStore.size > 0) {
    if (id.value) emit('selectionClick', { event: e as PointerEvent, id: id.value })
  } else {
    router.push(linkUrl.value)
  }
}

function handleSelectionClick(e: MouseEvent) {
  e.preventDefault()
  e.stopPropagation()
  if (id.value) emit('selectionClick', { event: e as PointerEvent, id: id.value })
}

function handlePointerDown() {
  if (id.value) mediaStore.fetchItem(id.value)
}
</script>

<template>
  <div
    class="grid-cell-container"
    v-memo="[isSelected, isSelectionMode, thumbnail, width, height]"
    :style="scaleStyle"
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
        }"
        :style="{ backgroundImage: `url(${thumbnail})` }"
      >
        <v-icon
          @click="handleSelectionClick"
          class="check-icon"
          color="secondary"
          :size="28"
          :icon="
            isSelected || !isSelectionMode
              ? 'mdi-check-circle'
              : 'mdi-checkbox-blank-circle-outline'
          "
        />

        <v-btn
          icon
          color="secondary"
          variant="flat"
          class="magnify-button"
          @click.stop
          :to="linkUrl"
          tabindex="-1"
        >
          <v-icon
            size="15"
            icon="mdi-fullscreen"
            v-tooltip:top="`View ${props.mediaItem?.isVideo ? 'video' : 'photo'}`"
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
  width: 100%;
  height: 100%;
  display: block;
  user-select: none;
  -webkit-user-drag: none;
}

.visual-content {
  width: 100%;
  height: 100%;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  transition:
    transform 0.15s ease-out,
    border-radius 0.15s ease-out,
    box-shadow 0.15s ease-out;
  position: relative;
  will-change: transform, box-shadow;
}

.magnify-button {
  position: absolute;
  bottom: 10px;
  right: 10px;
  width: 25px;
  height: 25px;
  z-index: 2;
  opacity: 0;
  transition: opacity 0.15s ease;
  pointer-events: none;
}

.is-selecting .visual-content:hover .magnify-button {
  opacity: 1;
  pointer-events: auto;
}

.check-icon {
  position: absolute;
  top: 10px;
  right: 8px;
  display: flex;
  z-index: 2;
  opacity: 0;
  transform: scale(1);
  pointer-events: none;
  cursor: pointer;
}

.check-icon:hover {
  opacity: 1 !important;
}

/* Logic: Show check icon if (Selected) OR (Hovering) OR (In Selection Mode) */
.visual-content.selected .check-icon,
.is-selecting .check-icon,
.visual-content:hover .check-icon {
  opacity: 1;
  pointer-events: auto;
}

.photo-grid-container:not(.is-selecting) .visual-content:not(.selected):hover .check-icon {
  opacity: 0.7;
}

.selected {
  transform: scale(var(--scale-x), var(--scale-y));
  box-shadow:
    inset 0 0 0 1.5px rgba(var(--v-theme-secondary), 1),
    0 0 0 4px rgba(var(--v-theme-secondary), 0.4);
  border-radius: 20px;
}
</style>
