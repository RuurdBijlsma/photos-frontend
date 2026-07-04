<script setup lang="ts">
import { ref, computed, watch, onUnmounted, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useSettingStore } from '@/scripts/stores/settingsStore.ts'
import { useMediaItemStore } from '@/scripts/stores/timeline/mediaItemStore.ts'
import { useViewPhotoStore } from '@/scripts/stores/timeline/viewPhotoStore.ts'
import mediaItemService from '@/scripts/services/mediaItemService.ts'
import axios from 'axios'

// todo: prop to turn off scroll capture (for settings page)
// todo: make use of motion photo presentation timestamp
// todo: if use_panorama_viewer -> add button to view panorama (PanoViewer.vue will be obsolete).
// todo: if zoomed in any level, then remove the click area to go next/prev in ViewPhoto.vue. Keep the button, remove the large click area.
// todo: if item has higher resolution, allow for deeper max zoom level

const props = defineProps<{
  mediaItemId: string
}>()

const mediaItemStore = useMediaItemStore()
const settings = useSettingStore()
const viewPhotoStore = useViewPhotoStore()

// Zoom and Pan state
const scale = ref(1)
const translateX = ref(0)
const translateY = ref(0)
const containerRef = ref<HTMLElement | null>(null)

const activePointers = new Map<number, PointerEvent>()
let initialPinchDistance = 0
let initialScale = 1
let isDragging = false
let startX = 0
let startY = 0
let startTranslateX = 0
let startTranslateY = 0

const fullImage = computed(() => mediaItemStore.mediaItems.get(props.mediaItemId))
const generatedThumbsAvailable = computed(() => fullImage.value?.has_thumbnails ?? true)

// Phase 1: Immediate Thumbnail URL (1440p)
const imageUrl = computed(() => {
  return mediaItemService.getPhotoThumbnail(
    props.mediaItemId,
    1440, // 1440p thumbnail for high resolution details
    !generatedThumbsAvailable.value,
  )
})

// Phase 2: Full Resolution Background Load
const fullResUrl = ref<string | null>(null)
const fullResLoaded = ref(false)
const isLoadingFull = ref(false)

let currentAbortController: AbortController | null = null

// Native format support check
function isMimeTypeSupported(mimeType?: string): boolean {
  if (!mimeType) return false
  const lower = mimeType.toLowerCase()
  // Standard formats supported by all modern browsers
  if (
    lower === 'image/jpeg' ||
    lower === 'image/jpg' ||
    lower === 'image/png' ||
    lower === 'image/webp' ||
    lower === 'image/gif' ||
    lower === 'image/avif'
  ) {
    return true
  }
  // HEIC support check (natively supported on Apple devices/Safari)
  if (lower === 'image/heic' || lower === 'image/heif') {
    return /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
  }
  return false
}

// Cleanup full resolution load resources
function cleanup() {
  if (currentAbortController) {
    currentAbortController.abort()
    currentAbortController = null
  }
  if (fullResUrl.value) {
    URL.revokeObjectURL(fullResUrl.value)
    fullResUrl.value = null
  }
  fullResLoaded.value = false
  isLoadingFull.value = false
}

// Start abortable download of the full-resolution media file
async function startFullResLoad() {
  cleanup()

  const item = fullImage.value
  if (!item) return

  // Bypasses the download if format is RAW, unsupported HEIC, etc.
  if (!isMimeTypeSupported(item.media_features?.mime_type)) {
    return
  }

  const controller = new AbortController()
  currentAbortController = controller
  isLoadingFull.value = true

  try {
    const res = await mediaItemService.downloadMediaFileById(item.id, controller.signal)

    // Check if we switched items or aborted in the meantime
    if (controller.signal.aborted || props.mediaItemId !== item.id) {
      return
    }

    const objectUrl = URL.createObjectURL(res.data)
    fullResUrl.value = objectUrl
  } catch (err: any) {
    if (err.name === 'CanceledError' || axios.isCancel(err) || controller.signal.aborted) {
      console.log('Background fetch aborted for image:', item.id)
    } else {
      console.error('Failed to load full-resolution image:', err)
    }
  } finally {
    if (currentAbortController === controller) {
      isLoadingFull.value = false
    }
  }
}

// Motion Photo Settings & Logic
const showingMotionVideo = ref(false)
const videoPlayerRef = ref<HTMLVideoElement | null>(null)
const motionVideoUrl = computed(() => {
  return mediaItemService.getMotionVideo(props.mediaItemId)
})

function playMotionPhoto() {
  if (!settings.playMotionPhotos) return
  showingMotionVideo.value = true
  nextTick(() => {
    if (videoPlayerRef.value) {
      videoPlayerRef.value.currentTime = 0
      videoPlayerRef.value.play().catch((err) => {
        console.error('Failed to autoplay motion photo:', err)
      })
    }
  })
}

function onVideoEnded() {
  showingMotionVideo.value = false
}

// Watchers
watch(
  () => props.mediaItemId,
  () => {
    // Reset zoom & pan when switching images
    scale.value = 1
    translateX.value = 0
    translateY.value = 0

    // Start motion photo autoplay if configured
    showingMotionVideo.value = false
    if (settings.playMotionPhotos && fullImage.value?.media_features?.is_motion_photo) {
      playMotionPhoto()
    }

    startFullResLoad()
  },
  { immediate: true },
)

watch(fullImage, (newVal) => {
  if (newVal && !fullResUrl.value && !isLoadingFull.value) {
    startFullResLoad()
  }
  if (
    newVal &&
    settings.playMotionPhotos &&
    newVal.media_features?.is_motion_photo &&
    !showingMotionVideo.value
  ) {
    playMotionPhoto()
  }
})

// Listen to motion trigger from ViewPhoto top right menu
watch(
  () => viewPhotoStore.playMotionTrigger,
  () => {
    if (fullImage.value?.media_features?.is_motion_photo) {
      playMotionPhoto()
    }
  },
)

onUnmounted(() => {
  cleanup()
})

const transformStyle = computed(() => {
  return {
    transform: `translate(${translateX.value}px, ${translateY.value}px) scale(${scale.value})`,
    transformOrigin: '0 0',
  }
})

function zoomToPoint(clientX: number, clientY: number, newScale: number) {
  if (!containerRef.value) return

  const rect = containerRef.value.getBoundingClientRect()
  const xScreen = clientX - rect.left
  const yScreen = clientY - rect.top

  const minScale = 1
  const maxScale = 8
  newScale = Math.max(minScale, Math.min(maxScale, newScale))

  const oldScale = scale.value
  if (oldScale === newScale) return

  // Zoom centered at the cursor coordinates
  const nextTranslateX = xScreen - (xScreen - translateX.value) * (newScale / oldScale)
  const nextTranslateY = yScreen - (yScreen - translateY.value) * (newScale / oldScale)

  scale.value = newScale
  translateX.value = nextTranslateX
  translateY.value = nextTranslateY

  clampTranslations()
}

function clampTranslations() {
  if (!containerRef.value) return

  const w = containerRef.value.clientWidth
  const h = containerRef.value.clientHeight

  if (scale.value <= 1) {
    translateX.value = 0
    translateY.value = 0
  } else {
    const minX = w * (1 - scale.value)
    const maxX = 0
    const minY = h * (1 - scale.value)
    const maxY = 0
    translateX.value = Math.max(minX, Math.min(maxX, translateX.value))
    translateY.value = Math.max(minY, Math.min(maxY, translateY.value))
  }
}

// Pointer events panning & pinch-to-zoom
function handlePointerDown(e: PointerEvent) {
  // Only allow drag/pan with left mouse button, touch, or pen. Right-clicks bypass.
  if (e.pointerType === 'mouse' && e.button !== 0) {
    return
  }

  const target = e.currentTarget as HTMLElement
  target.setPointerCapture(e.pointerId)
  activePointers.set(e.pointerId, e)

  if (activePointers.size === 1) {
    isDragging = true
    startX = e.clientX
    startY = e.clientY
    startTranslateX = translateX.value
    startTranslateY = translateY.value
  } else if (activePointers.size === 2) {
    isDragging = false
    const pointers = Array.from(activePointers.values())
    const dx = pointers[0].clientX - pointers[1].clientX
    const dy = pointers[0].clientY - pointers[1].clientY
    initialPinchDistance = Math.sqrt(dx * dx + dy * dy)
    initialScale = scale.value
  }
}

function handlePointerMove(e: PointerEvent) {
  if (!activePointers.has(e.pointerId)) return
  activePointers.set(e.pointerId, e)

  if (activePointers.size === 1 && isDragging) {
    const dx = e.clientX - startX
    const dy = e.clientY - startY
    translateX.value = startTranslateX + dx
    translateY.value = startTranslateY + dy
    clampTranslations()
  } else if (activePointers.size === 2) {
    const pointers = Array.from(activePointers.values())
    const dx = pointers[0].clientX - pointers[1].clientX
    const dy = pointers[0].clientY - pointers[1].clientY
    const distance = Math.sqrt(dx * dx + dy * dy)
    if (initialPinchDistance > 0) {
      const factor = distance / initialPinchDistance
      const newScale = initialScale * factor
      const currentMidX = (pointers[0].clientX + pointers[1].clientX) / 2
      const currentMidY = (pointers[0].clientY + pointers[1].clientY) / 2
      zoomToPoint(currentMidX, currentMidY, newScale)
    }
  }
}

function handlePointerUp(e: PointerEvent) {
  activePointers.delete(e.pointerId)
  try {
    const target = e.currentTarget as HTMLElement
    target.releasePointerCapture(e.pointerId)
  } catch (err) {
    // Ignore
  }

  if (activePointers.size === 0) {
    isDragging = false
  } else if (activePointers.size === 1) {
    // Resume dragging with the remaining pointer
    const remaining = Array.from(activePointers.values())[0]
    isDragging = true
    startX = remaining.clientX
    startY = remaining.clientY
    startTranslateX = translateX.value
    startTranslateY = translateY.value
  }
}

function handlePointerCancel(e: PointerEvent) {
  handlePointerUp(e)
}

function handleGlobalWheel(e: WheelEvent) {
  const target = e.target as HTMLElement
  // Only zoom if the event isn't targeted inside overlays, info panels or menus
  if (
    target.closest('.media-info-panel') ||
    target.closest('.v-overlay') ||
    target.closest('.v-menu')
  ) {
    return
  }

  e.preventDefault()
  // Adjust zoom sensitivity based on device
  const zoomFactor = e.ctrlKey ? 0.05 : 0.01
  const direction = e.deltaY < 0 ? 1 : -1
  const newScale = scale.value * (1 + direction * zoomFactor * 10)
  zoomToPoint(e.clientX, e.clientY, newScale)
}

function handleDoubleClick(e: MouseEvent) {
  if (e.button !== 0) return
  if (scale.value > 1) {
    scale.value = 1
    translateX.value = 0
    translateY.value = 0
  } else {
    zoomToPoint(e.clientX, e.clientY, 3)
  }
}

onMounted(() => {
  // Passive false is required to let handleGlobalWheel prevent default scroll behavior
  window.addEventListener('wheel', handleGlobalWheel, { passive: false })
})

onBeforeUnmount(() => {
  window.removeEventListener('wheel', handleGlobalWheel)
})
</script>

<template>
  <div class="photo-viewer-wrapper">
    <div
      v-if="settings.useImageGlow"
      class="blurry-bg"
      :style="{
        backgroundImage: `url(${imageUrl})`,
      }"
    ></div>

    <div
      ref="containerRef"
      class="zoom-pan-container"
      :class="{ 'zoomed-in': scale > 1 }"
      @pointerdown="handlePointerDown"
      @pointermove="handlePointerMove"
      @pointerup="handlePointerUp"
      @pointercancel="handlePointerCancel"
      @dblclick="handleDoubleClick"
    >
      <div class="image-wrapper" :style="transformStyle">
        <!-- Thumbnail layer at bottom -->
        <img
          class="image-tag thumbnail-img"
          :src="imageUrl"
          alt="Thumbnail image"
          @dragstart.prevent
        />

        <!-- Full-resolution layer stacked on top -->
        <img
          v-if="fullResUrl"
          class="image-tag full-res-img"
          :src="fullResUrl"
          alt="Full resolution image"
          decoding="async"
          loading="lazy"
          :style="{
            opacity: fullResLoaded ? 1 : 0,
            pointerEvents: fullResLoaded ? 'auto' : 'none',
          }"
          @load="fullResLoaded = true"
          @dragstart.prevent
        />

        <!-- Motion Photo Video Overlay -->
        <video
          ref="videoPlayerRef"
          v-if="showingMotionVideo"
          class="image-tag motion-video-tag"
          :src="motionVideoUrl"
          autoplay
          muted
          playsinline
          @ended="onVideoEnded"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.photo-viewer-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.blurry-bg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-size: contain;
  background-position: center;
  filter: blur(50px) brightness(60%);
}

.zoom-pan-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  touch-action: none;
  cursor: default;
}

.zoom-pan-container.zoomed-in {
  cursor: grab;
}

.zoom-pan-container.zoomed-in:active {
  cursor: grabbing;
}

.image-wrapper {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.image-tag {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  user-select: none;
}

.full-res-img {
  z-index: 2;
}

.motion-video-tag {
  z-index: 10;
  background-color: transparent;
}
</style>
