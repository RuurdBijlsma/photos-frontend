<script setup lang="ts">
import {  onMounted, onUnmounted, ref, watch, shallowRef } from 'vue'
import type { TimelineMonth } from '@/scripts/types/generated/photos.ts'
import { useTheme } from 'vuetify/framework'
import { MONTHS } from '@/scripts/constants.ts'

// --- Props ---
const props = defineProps<{
  months: TimelineMonth[] | undefined | null
  dateInView: Date | null
}>()

// --- Refs ---
const canvasRef = ref<HTMLCanvasElement | null>(null)
const containerRef = ref<HTMLElement | null>(null)
// Use shallowRef for performance on complex objects logic doesn't need to deeply track
const hovering = shallowRef(false)

// --- Config ---
const PADDING = { vertical: 15, horizontal: 5 }
const FONT = { size: 12, family: 'Montserrat' }
const DOT_RADIUS = 2
const MIN_YEAR_SPACING = FONT.size + 10

// --- Theme ---
const theme = useTheme()

// --- Offscreen Buffer (Double Buffering) ---
let offscreenCanvas: HTMLCanvasElement | null = null
let offscreenCtx: CanvasRenderingContext2D | null = null

// --- State Cache ---
// We use a lookup map for O(1) access instead of looping arrays during scroll
type DateLookup = {
  y: number         // The normalized Y start (0-1)
  fraction: number  // How much specific weight this month has
}

// Store raw data to avoid reactivity overhead in render loop
const lookupMap: Map<string, DateLookup> = new Map()
let renderState = {
  years: [] as { label: string; y: number }[],
  months: [] as { label: string; y: number }[],
  thumbHeight: 0,
}

// --- Helpers ---
// Fast string parsing without creating Date objects if possible
const getMonthKey = (date: Date) => `${date.getFullYear()}-${date.getMonth() + 1}`
const parseMonthId = (monthId: string) => {
  const [year, month, day] = monthId.split('-').map(Number)
  return { year: year ?? 0, month: month ?? 0, day: day ?? 0 }
}

// --- Heavy Calculation (Run only when data changes) ---
function buildRenderCache() {
  const items = props.months
  lookupMap.clear()

  if (!items || items.length === 0) {
    renderState = { years: [], months: [], thumbHeight: 0 }
    return
  }

  const totalCount = items.reduce((acc, m) => acc + m.count, 0)

  // Precompute totals per year for label positioning
  const yearTotals: Record<number, number> = {}
  for (const it of items) {
    const d = parseMonthId(it.monthId)
    yearTotals[d.year] = (yearTotals[d.year] || 0) + it.count
  }

  let cumulative = 0
  let lastYear = -1

  const years: typeof renderState.years = []
  const months: typeof renderState.months = []

  for (const item of items) {
    const d = parseMonthId(item.monthId)
    const count = item.count

    // --- Lookup Map Construction ---
    // Store the starting Y (normalized 0-1) for this specific Year-Month
    const startY = cumulative / totalCount
    const weight = count / totalCount

    // Key format: "2023-5"
    const key = `${d.year}-${d.month}`

    // If multiple entries exist for same month (rare but possible in some split timelines),
    // we only cache the first one or need to aggregate. Assuming unique months here.
    lookupMap.set(key, { y: startY, fraction: weight })

    // --- Visual State Construction ---
    if (d.year !== lastYear) {
      const yearTotal = yearTotals[d.year] || 0
      const yForYear = (cumulative + yearTotal) / totalCount
      years.push({ label: String(d.year), y: yForYear })
      lastYear = d.year
    }

    cumulative += count
    const yForMonth = cumulative / totalCount // End of month
    months.push({
      label: `${MONTHS[d.month - 1]?.substring(0, 3) ?? ''} ${d.year}`,
      y: yForMonth,
    })
  }

  const approxItemsPerPage = 15
  const thumbHeight = Math.max(approxItemsPerPage / (totalCount || 1), 0.01)

  renderState = { years, months, thumbHeight }

  // Update the static background image immediately
  drawStaticLayer()
}

// --- O(1) Scroll Calculation ---
function getThumbY(date: Date | null): number {
  if (!date || lookupMap.size === 0) return 0

  const key = getMonthKey(date)
  const data = lookupMap.get(key)

  // If we can't find the exact month, we return 0 or clamp.
  // Improvement: Find nearest month if gaps exist, but keeping it fast for now.
  if (!data) return 0

  const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  // 1 - ratio because sorted Newest -> Oldest (Top -> Bottom)
  // If timeline is Oldest -> Newest, remove the (1 - ...)
  const dayRatio = 1 - Math.min(1, date.getDate() / daysInMonth)

  return data.y + (data.fraction * dayRatio)
}

function yPos(v: number, height: number): number {
  return PADDING.vertical + v * (height - PADDING.vertical * 2)
}

// --- Rendering Layers ---

// 1. Static Layer (Years, Dots, Background) - Drawn to Offscreen Canvas
function drawStaticLayer() {
  if (!canvasRef.value || !offscreenCtx || !offscreenCanvas) return

  const width = offscreenCanvas.width
  const height = offscreenCanvas.height
  const ctx = offscreenCtx

  // Clear
  ctx.clearRect(0, 0, width, height)
  ctx.font = `${FONT.size}px ${FONT.family}, Arial, sans-serif`

  // Theme Colors
  const themeColors = theme.current.value.colors
  const textColor = themeColors['on-background'] + 'bb' // Hex + alpha
  const dotColor = themeColors['surface-container-highest']!
  const bgColor = themeColors['surface-container']!

  // --- Draw Dots (only if hovering or always? Your logic implies only on hover) ---
  // If we only show dots on hover, we might want to redraw static layer on hover change.
  if (hovering.value) {
    const dotX = width - PADDING.horizontal + DOT_RADIUS / 2
    ctx.fillStyle = dotColor

    // Batch draw calls for circles if possible, but basic loop is fast enough for static render
    ctx.beginPath()
    for (const m of renderState.months) {
      // Move to helps avoid connecting lines
      const py = yPos(m.y, height)
      ctx.moveTo(dotX, py)
      ctx.arc(dotX, py, DOT_RADIUS, 0, Math.PI * 2)
    }
    ctx.fill()
  }

  // --- Draw Years ---
  let prevY = -Infinity

  for (let i = 0; i < renderState.years.length; i++) {
    const { label, y } = renderState.years[i]!
    const targetY = yPos(y, height)

    // Layout logic matches your original
    if (i > 0 && targetY - prevY < MIN_YEAR_SPACING && i !== renderState.years.length - 1) continue

    let finalY = targetY
    if (i > 0) {
      const diff = targetY - prevY
      if (diff < MIN_YEAR_SPACING) finalY += MIN_YEAR_SPACING - diff
    }
    prevY = finalY

    const textMetrics = ctx.measureText(label)
    const textWidth = textMetrics.width
    const x = width - textWidth - PADDING.horizontal - 5

    // Draw Background Pill (Only on hover)
    if (hovering.value) {
      ctx.fillStyle = bgColor
      ctx.beginPath()
      // Use roundRect if supported, polyfill if not (modern browsers support it)
      if (ctx.roundRect) {
        ctx.roundRect(x - 7, finalY - FONT.size - 4, textWidth + 14, FONT.size + 10, 10)
      } else {
        ctx.rect(x - 7, finalY - FONT.size - 4, textWidth + 14, FONT.size + 10)
      }
      ctx.fill()
    }

    ctx.fillStyle = textColor
    ctx.fillText(label, x, finalY)
  }

  // Trigger main render to update screen
  requestRender()
}

// 2. Main Render
function renderFrame() {
  const canvas = canvasRef.value
  if (!canvas || !offscreenCanvas) return

  const ctx = canvas.getContext('2d', { alpha: true }) // alpha true for transparent bg
  if (!ctx) return

  // 1. Clear & Blit Background
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(offscreenCanvas, 0, 0)

  // 2. Calculate Thumb Position (O(1))
  const normY = getThumbY(props.dateInView)
  const pxY = yPos(normY, canvas.height)
  const thumbH = renderState.thumbHeight * (canvas.height - PADDING.vertical * 2)

  // 3. Draw Thumb
  ctx.fillStyle = theme.current.value.colors.primary
  ctx.beginPath()

  // x position
  const x = canvas.width - PADDING.horizontal - 1

  ctx.roundRect(x, pxY - thumbH, 4, thumbH, 3)
  ctx.fill()

  rafId = null
}

// --- RAF Management ---
let rafId: number | null = null

function requestRender() {
  if (rafId === null) {
    rafId = requestAnimationFrame(renderFrame)
  }
}

// --- Sizing ---
function resizeCanvas() {
  const canvas = canvasRef.value
  const container = containerRef.value
  if (!canvas || !container) return

  const dpr = window.devicePixelRatio || 1
  const rect = container.getBoundingClientRect()

  // Avoid re-allocating canvas if size hasn't changed to prevent flicker
  if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    canvas.style.width = `${rect.width}px`
    canvas.style.height = `${rect.height}px`

    // Init offscreen buffer
    if (!offscreenCanvas) offscreenCanvas = document.createElement('canvas')
    offscreenCanvas.width = canvas.width
    offscreenCanvas.height = canvas.height
    offscreenCtx = offscreenCanvas.getContext('2d')
    if (offscreenCtx) offscreenCtx.scale(dpr, dpr) // Scale context once
  }

  // Re-run heavy logic because pixels changed
  drawStaticLayer()
}

// --- Watchers ---

// Very lightweight watcher for the scroll.
// Just requests a frame. logic happens in renderFrame using pre-calculated map.
watch(() => props.dateInView, () => {
  requestRender()
})

// Deep/Heavy data changes
watch(() => props.months, () => {
  buildRenderCache() // Rebuilds Map & Static Image
}, { deep: false }) // Assuming array ref changes, if deep content changes use deep: true or watching specific prop

watch(hovering, () => {
  drawStaticLayer() // Redraws background to show/hide dots/pills
})

watch(() => theme.current.value.dark, () => {
  drawStaticLayer() // Redraw on theme change
})

// --- Lifecycle ---
onMounted(() => {
  // Use ResizeObserver instead of window resize for better container support
  const ro = new ResizeObserver(() => {
    resizeCanvas()
  })
  if (containerRef.value) ro.observe(containerRef.value)

  buildRenderCache()

  onUnmounted(() => {
    ro.disconnect()
    if (rafId) cancelAnimationFrame(rafId)
    offscreenCanvas = null
    offscreenCtx = null
  })
})
</script>

<template>
  <div
    ref="containerRef"
    class="timeline-container"
    @mouseenter="hovering = true"
    @mouseleave="hovering = false"
  >
    <canvas ref="canvasRef" class="timeline-canvas"></canvas>
  </div>
</template>

<style scoped>
.timeline-container {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  /* Hardware acceleration hint */
  transform: translateZ(0);
}

.timeline-canvas {
  display: block;
  width: 100%;
  height: 100%;
  /* Prevent touch actions like zooming on the canvas */
  touch-action: none;
}
</style>
