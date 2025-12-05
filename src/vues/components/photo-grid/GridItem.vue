<script setup lang="ts">
import photoService from '@/scripts/services/photoService.ts'
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useMediaStore } from '@/scripts/stores/mediaStore.ts'
import type { TimelineItem } from '@/scripts/types/generated/timeline.ts'
import { useSelectionStore } from '@/scripts/stores/selectionStore.ts'

const mediaStore = useMediaStore()
const selectionStore = useSelectionStore()
const router = useRouter()

const props = defineProps<{
  mediaItem?: TimelineItem
  height: number
  width: number
}>()

export type SelectionPayload = { event: PointerEvent; id: string }
const emit = defineEmits<{
  (e: 'selectionClick', payload: SelectionPayload): void
}>()

const thumbnail = computed(() =>
  props.mediaItem?.id ? photoService.getPhotoThumbnail(props.mediaItem.id, 240) : '',
)

const linkUrl = computed(() =>
  props.mediaItem?.id ? `/view/${props.mediaItem.id}` : '#'
)

const isSelected = computed(() =>
  props.mediaItem?.id ? selectionStore.isSelected(props.mediaItem.id) : false
)

// Calculate separate scales for X and Y to ensure exactly 8px reduction on both axes.
// This fixes the clipping issue on non-square aspect ratios.
const scaleStyle = computed(() => {
  if (props.width <= 0 || props.height <= 0) return { '--sx': 1, '--sy': 1 }
  return {
    '--sx': (props.width - 8) / props.width,
    '--sy': (props.height - 8) / props.height
  }
})

async function openImage() {
  const id = props.mediaItem?.id
  if (id) await router.push({ path: `/view/${id}` })
}

function handleLinkClick(e: MouseEvent) {
  // 1. EXTERNAL NAVIGATION:
  // Allow browser default ONLY for:
  // - Middle Click (button 1)
  // - Ctrl + Click (Windows/Linux)
  // - Cmd/Meta + Click (macOS)
  if (e.button === 1 || e.ctrlKey || e.metaKey) {
    return
  }

  // 2. INTERNAL APP LOGIC (Selection):
  // Prevent default for:
  // - Standard Click (Navigation)
  // - Shift + Click (New Window)
  e.preventDefault()

  const id = props.mediaItem?.id
  // We pass the event up. The parent component will check e.shiftKey
  // to handle the multi-selection range.
  if (id) emit('selectionClick', { event: e as PointerEvent, id })
}
</script>

<template>
  <!--
    The Outer Div controls the physical space in the grid (Layout).
    Strict containment here stops the browser from recalculating layout for the whole page.
  -->
  <div
    class="grid-cell-container"
    :style="{
      width: width + 'px',
      height: height + 'px',
      containIntrinsicWidth: width + 'px',
      containIntrinsicHeight: height + 'px'
    }"
  >
    <!--
      The Anchor Tag provides accessibility and native link features.
      href gives us the status bar URL and 'Open in New Tab'.
    -->
    <a
      :href="linkUrl"
      class="grid-item-link"
      draggable="false"
      @click="handleLinkClick"
      @dblclick="openImage"
      @mousedown="props.mediaItem?.id && mediaStore.fetchItem(props.mediaItem.id)"
    >
      <!--
        The Visual Div handles the background image and selection animation.
        It transitions via GPU-only properties (Transform/Opacity).
      -->
      <div
        class="visual-content"
        :class="{ selected: isSelected }"
        :style="{
          ...scaleStyle,
          backgroundImage: `url(${thumbnail})`,
        }"
      >
        <v-fade-transition>
          <div class="check-icon" v-if="isSelected">
            <v-icon size="15">mdi-check</v-icon>
          </div>
        </v-fade-transition>
      </div>
    </a>
  </div>
</template>

<style scoped>
.grid-cell-container {
  display: block;
  /* Optimization: Tells browser this box's size is known and independent */
  contain: strict;
  content-visibility: auto;
  transform: translateZ(0);
}

.grid-item-link {
  display: block;
  width: 100%;
  height: 100%;
  text-decoration: none;
  cursor: default; /* Keep your cursor preference */
  user-select: none;
  -webkit-user-drag: none;
}

.visual-content {
  width: 100%;
  height: 100%;
  background-color: rgba(255, 255, 255, 0.1);
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;

  will-change: transform;
  transform-origin: center center;

  /* Transition ONLY these properties to prevent layout reflows */
  transition:
    transform 0.15s ease-in-out,
    border-radius 0.15s ease-in-out,
    box-shadow 0.15s ease-in-out;
}

.selected {
  /* Scale X and Y independently to create an even margin border */
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
  background-color: rgba(var(--v-theme-secondary), 1);
  border-radius: 50%;
  color: rgb(var(--v-theme-on-secondary));
  width: 25px;
  height: 25px;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2;

  /* Counter-scale the icon so it doesn't look squished?
     Optional: transform: scale(calc(1 / var(--sx)), calc(1 / var(--sy)));
     Usually not visible enough to matter on a checkmark. */
}
</style>
