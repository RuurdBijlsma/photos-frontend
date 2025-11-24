<script setup lang="ts">
import { ref, onMounted, watch, onUnmounted } from 'vue'
import type { TimelineMonth } from '@/scripts/types/generated/photos.ts'

// --- Props & Emits ---
const props = defineProps<{
  months: TimelineMonth[]
}>()

const emit = defineEmits<{
  (e: 'scroll-to', monthId: string): void
}>()

// --- State ---
const canvasRef = ref<HTMLCanvasElement | null>(null)
const containerRef = ref<HTMLElement | null>(null)
const hoverY = ref<number | null>(null)
const isDragging = ref(false)

// Constants for styling
const STYLES = {
  font: '600 12px "Google Sans", Roboto, Arial, sans-serif',
  textColor: '#ffffff', // White text
  tickColor: '#9aa0a6', // Gray dots
  hoverColor: '#8ab4f8', // Google Blue
  bubbleBg: '#1f1f1f',
  paddingRight: 10,
  minLabelSpacing: 40, // Minimum pixels between year labels
}

// --- Helpers ---
const parseYear = (monthId: string) => monthId.split('-')[0]
const parseMonthName = (monthId: string) => {
  const [y, m] = monthId.split('-')
  const date = new Date(parseInt(y), parseInt(m) - 1)
  return date.toLocaleString('default', { month: 'short' })
}

// --- Drawing Logic ---
const draw = () => {
  const canvas = canvasRef.value
  if (!canvas || !props.months.length) return

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const width = canvas.width
  const height = canvas.height
  const totalItems = props.months.length

  // Clear canvas
  ctx.clearRect(0, 0, width, height)

  // 1. Calculate positions
  // We distribute the months evenly across the height.
  // In a real app, you might weight this by 'count' (photo density),
  // but usually, timeline navigation represents the list items linearly.
  const itemHeight = height / totalItems

  let lastLabelY = -100 // Track last drawn text to avoid overlap

  props.months.forEach((month, index) => {
    const centerY = (index * itemHeight) + (itemHeight / 2)
    const year = parseYear(month.monthId)
    const prevMonth = props.months[index - 1]
    const prevYear = prevMonth ? parseYear(prevMonth.monthId) : null

    // Determine if we should draw a Year Label or a Tick (Dot)
    const isNewYear = year !== prevYear
    const hasSpace = (centerY - lastLabelY) > STYLES.minLabelSpacing

    // Draw Logic
    if (isNewYear && hasSpace) {
      // Draw Year Text
      ctx.fillStyle = STYLES.textColor
      ctx.font = STYLES.font
      ctx.textAlign = 'right'
      ctx.textBaseline = 'middle'
      ctx.fillText(year, width - STYLES.paddingRight, centerY)

      lastLabelY = centerY
    } else {
      // Draw Month Dot (Tick)
      // Only draw dots if we aren't colliding with a label
      if (Math.abs(centerY - lastLabelY) > 15) {
        ctx.beginPath()
        ctx.fillStyle = STYLES.tickColor
        ctx.arc(width - STYLES.paddingRight - 2, centerY, 1.5, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  })

  // 2. Draw Hover/Drag Indicator
  if (hoverY.value !== null) {
    drawHoverEffect(ctx, width, height, itemHeight)
  }
}

const drawHoverEffect = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  itemHeight: number
) => {
  if (hoverY.value === null) return

  // Find closest month to mouse position
  const index = Math.floor(hoverY.value / itemHeight)
  const safeIndex = Math.max(0, Math.min(index, props.months.length - 1))
  const targetMonth = props.months[safeIndex]

  const centerY = (safeIndex * itemHeight) + (itemHeight / 2)

  // Draw the blue selection dot
  ctx.beginPath()
  ctx.fillStyle = STYLES.hoverColor
  ctx.arc(width - STYLES.paddingRight - 2, centerY, 4, 0, Math.PI * 2)
  ctx.fill()

  // Draw the "Bubble" to the left
  // Format: "Aug 2017"
  const label = `${parseMonthName(targetMonth.monthId)} ${parseYear(targetMonth.monthId)}`

  ctx.font = STYLES.font
  const textMetrics = ctx.measureText(label)
  const bubbleWidth = textMetrics.width + 16
  const bubbleHeight = 24
  const bubbleX = width - STYLES.paddingRight - 20 - bubbleWidth
  const bubbleY = centerY - (bubbleHeight / 2)

  // Bubble Background (Rounded Rect)
  ctx.fillStyle = STYLES.bubbleBg
  roundRect(ctx, bubbleX, bubbleY, bubbleWidth, bubbleHeight, 12)
  ctx.fill()

  // Bubble Text
  ctx.fillStyle = STYLES.textColor
  ctx.textAlign = 'center'
  ctx.fillText(label, bubbleX + (bubbleWidth / 2), centerY)
}

// Helper for rounded rectangle
const roundRect = (
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
) => {
  if (w < 2 * r) r = w / 2;
  if (h < 2 * r) r = h / 2;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// --- Interaction Handlers ---

const handleInteraction = (event: MouseEvent | TouchEvent) => {
  const canvas = canvasRef.value
  if (!canvas) return

  const rect = canvas.getBoundingClientRect()
  const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY

  // Calculate relative Y
  const y = clientY - rect.top
  hoverY.value = Math.max(0, Math.min(y, rect.height)) // Clamp

  // Redraw to show hover effect
  requestAnimationFrame(draw)

  // Calculate index and emit
  if (isDragging.value || event.type === 'click') {
    const itemHeight = rect.height / props.months.length
    const index = Math.floor(hoverY.value / itemHeight)
    const safeIndex = Math.max(0, Math.min(index, props.months.length - 1))
    emit('scroll-to', props.months[safeIndex].monthId)
  }
}

const onMouseDown = (e: MouseEvent) => {
  isDragging.value = true
  handleInteraction(e)
  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)
}

const onMouseMove = (e: MouseEvent) => {
  if (isDragging.value) {
    handleInteraction(e)
  } else {
    // Just update hover visual, don't scroll
    const canvas = canvasRef.value
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    hoverY.value = Math.max(0, Math.min(e.clientY - rect.top, rect.height))
    requestAnimationFrame(draw)
  }
}

const onMouseUp = () => {
  isDragging.value = false
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('mouseup', onMouseUp)
}

const onMouseLeave = () => {
  if (!isDragging.value) {
    hoverY.value = null
    requestAnimationFrame(draw)
  }
}

// --- Lifecycle & Resizing ---

const resizeCanvas = () => {
  const canvas = canvasRef.value
  const container = containerRef.value
  if (!canvas || !container) return

  const dpr = window.devicePixelRatio || 1
  const rect = container.getBoundingClientRect()

  // Set actual size in memory (scaled to account for extra pixel density)
  canvas.width = rect.width * dpr
  canvas.height = rect.height * dpr

  // Normalize coordinate system to use css pixels
  const ctx = canvas.getContext('2d')
  if (ctx) ctx.scale(dpr, dpr)

  // Set visible size
  canvas.style.width = `${rect.width}px`
  canvas.style.height = `${rect.height}px`

  draw()
}

// Watch for data changes to redraw
watch(() => props.months, () => {
  resizeCanvas()
}, { deep: true })

onMounted(() => {
  window.addEventListener('resize', resizeCanvas)
  // Initial draw
  setTimeout(resizeCanvas, 50) // Small delay to ensure container has layout
})

onUnmounted(() => {
  window.removeEventListener('resize', resizeCanvas)
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('mouseup', onMouseUp)
})
</script>

<template>
  <div ref="containerRef" class="timeline-container">
    <canvas
      ref="canvasRef"
      class="timeline-canvas"
      @mousedown="onMouseDown"
      @mousemove="onMouseMove"
      @mouseleave="onMouseLeave"
      @click="handleInteraction"
    ></canvas>
  </div>
</template>

<style scoped>
.timeline-container {
  width: 100%;
  height: 100%;
  position: relative;
  /* Ensure the container doesn't overflow implicitly */
  overflow: hidden;
  cursor: pointer;
}

.timeline-canvas {
  display: block;
  touch-action: none; /* Prevent page scroll on mobile when touching canvas */
}
</style>
