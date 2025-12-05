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

const props = defineProps<{
  mediaItem?: TimelineItem
  height: number
  width: number
}>()

export type SelectionPayload = { event: PointerEvent; id: string }
const emit = defineEmits<{ (e: 'selectionClick', payload: SelectionPayload): void }>()

// Cache id for all dependent computations
const id = computed(() => props.mediaItem?.id ?? '')

// Memoized computed values
const thumbnail = computed(() => (id.value ? photoService.getPhotoThumbnail(id.value, 240) : ''))

const linkUrl = computed(() => (id.value ? `/view/${id.value}` : '#'))

const isSelected = computed(() => (id.value ? selectionStore.isSelected(id.value) : false))

// Return static empty object (not new each render)
const EMPTY_STYLE = Object.freeze({})

// Only compute scale when valid
const scaleStyle = computed(() => {
  const { width, height } = props
  if (!width || !height) return EMPTY_STYLE

  return {
    '--sx': (width - 8) / width,
    '--sy': (height - 8) / height,
  }
})

function openImage() {
  if (id.value) router.push(`/view/${id.value}`)
}

function handleLinkClick(e: MouseEvent) {
  // Allow Ctrl/Meta/Shift to pass through for selection logic.
  // We still block middle mouse button (1) if you want to preserve that behavior.
  if (e.button === 1) return

  // Prevent default browser navigation (opening new tab on Ctrl+Click)
  // so we can handle the selection logic instead.
  e.preventDefault()

  if (id.value) emit('selectionClick', { event: e as PointerEvent, id: id.value })
}
</script>

<template>
  <div
    class="grid-cell-container"
    :style="{
      width: width + 'px',
      height: height + 'px',
      containIntrinsicWidth: width + 'px',
      containIntrinsicHeight: height + 'px',
    }"
  >
    <a
      :href="linkUrl"
      class="grid-item-link"
      draggable="false"
      @click="handleLinkClick"
      @dblclick="openImage"
      @pointerdown="id && mediaStore.fetchItem(id)"
    >
      <div
        class="visual-content"
        :class="{ selected: isSelected }"
        :style="{
          ...scaleStyle,
          backgroundImage: `url(${thumbnail})`,
        }"
      >
        <v-fade-transition>
          <div class="check-icon" v-if="isSelected && selectionStore.selectedIds.length > 1">
            <v-icon size="15">mdi-check</v-icon>
          </div>
        </v-fade-transition>
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
    transform 0.15s,
    border-radius 0.15s,
    box-shadow 0.15s;
}

.selected {
  transform: scale(var(--sx), var(--sy));
  box-shadow:
    inset 0 0 0 1.5px rgba(var(--v-theme-secondary), 1),
    0 0 0 4px rgba(var(--v-theme-secondary), 0.4);
  border-radius: 20px;
}

.check-icon {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 25px;
  height: 25px;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 50%;
  background-color: rgba(var(--v-theme-secondary), 1);
  color: rgb(var(--v-theme-on-secondary));
  z-index: 2;
}
</style>
