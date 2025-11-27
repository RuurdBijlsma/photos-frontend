<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import type { TimelineMonth } from '@/scripts/types/generated/photos.ts'
import { useTheme } from 'vuetify/framework'
import { MONTHS } from '@/scripts/constants.ts'

// --- Props ---
const props = defineProps<{
  months: TimelineMonth[] | undefined | null
  scrollY: number
}>()

// --- Refs ---
const canvasRef = ref<HTMLCanvasElement | null>(null)
const containerRef = ref<HTMLElement | null>(null)
const hovering = ref(false)

// --- Config ---
const PADDING = { vertical: 15, horizontal: 5 }
const FONT = { size: 12, family: 'Montserrat' }
const DOT_RADIUS = 2
const MIN_YEAR_SPACING = FONT.size + 10

// --- Theme ---
const theme = useTheme()

// --- Canvas Context ---
const ctx = computed(() => canvasRef.value?.getContext('2d') ?? null)

// --- Helpers ---
const parseMonthId = (monthId: string) => {
  const [year, month, day] = monthId.split('-').map(Number)
  return { year: year ?? 0, month: month ?? 0, day: day ?? 0 }
}

// --- Render State ---
interface RenderState {
  years: { label: string; y: number }[]
  months: { label: string; y: number }[]
  scrollThumbHeight: number
}

let renderState: RenderState = { years: [], months: [], scrollThumbHeight: 0 }

function buildRenderState(): RenderState {
  const items = props.months
  if (!items) return { years: [], months: [], scrollThumbHeight: 0 }

  const totalCount = items.reduce((acc, m) => acc + m.count, 0)
  let cumulative = 0
  let lastYear = -1

  const years: RenderState['years'] = []
  const months: RenderState['months'] = []

  for (const item of items) {
    cumulative += item.count
    const date = parseMonthId(item.monthId)
    const y = cumulative / totalCount

    if (date.year !== lastYear) {
      years.push({ label: String(date.year), y })
      lastYear = date.year
    }

    months.push({
      label: `${MONTHS[date.month - 1]!.substring(0, 3)} ${date.year}`,
      y,
    })
  }

  const minScrollThumbHeight = 0.01
  const approxItemsPerPage = 15
  const scrollThumbHeight = Math.max(approxItemsPerPage / totalCount, minScrollThumbHeight)
  console.log(years, months, scrollThumbHeight)
  return { years, months, scrollThumbHeight }
}

// Convenience Y position
function yPos(v: number): number {
  const h = canvasRef.value?.height ?? 0
  return PADDING.vertical + v * (h - PADDING.vertical * 2)
}

// --- Rendering ---
let raf: number | null = null

function renderFrame() {
  const canvas = canvasRef.value
  const c = ctx.value
  if (!canvas || !c) return
  console.log('render')

  c.clearRect(0, 0, canvas.width, canvas.height)
  c.font = `${FONT.size}px ${FONT.family}, Arial, sans-serif`

  if (hovering.value) renderDots(canvas, c)
  renderYears(canvas, c)

  // Only animate if hovering
  if (hovering.value) raf = requestAnimationFrame(renderFrame)

  c.fillStyle = theme.current.value.colors.primary
  c.beginPath()
  c.roundRect(
    canvas.width - PADDING.horizontal - 1,
    yPos(props.scrollY),
    4,
    renderState.scrollThumbHeight * (canvas.height - PADDING.vertical * 2),
    3,
  )
  c.fill()
}

function renderOnce() {
  cancelRender()
  renderFrame()
}

function startRender() {
  if (raf == null) raf = requestAnimationFrame(renderFrame)
}

function cancelRender() {
  if (raf != null) cancelAnimationFrame(raf)
  raf = null
}

// --- Drawing ---
function renderYears(canvas: HTMLCanvasElement, c: CanvasRenderingContext2D) {
  let prevY = -Infinity

  const textColor = theme.current.value.colors['on-background'] + 'bb'
  const bgColor = theme.current.value.colors['surface-container']!

  for (let i = 0; i < renderState.years.length; i++) {
    const { label, y } = renderState.years[i]!
    const targetY = yPos(y)

    // Skip overlapping labels except last one
    if (i > 0 && targetY - prevY < MIN_YEAR_SPACING && i !== renderState.years.length - 1) continue

    let finalY = targetY
    if (i > 0) {
      const diff = targetY - prevY
      if (diff < MIN_YEAR_SPACING) finalY += MIN_YEAR_SPACING - diff
    }

    prevY = finalY
    const textWidth = c.measureText(label).width
    const x = canvas.width - textWidth - PADDING.horizontal - 5

    if (hovering.value) {
      c.fillStyle = bgColor
      c.beginPath()
      c.roundRect(x - 7, finalY - FONT.size - 4, textWidth + 14, FONT.size + 10, 10)
      c.fill()
    }

    c.fillStyle = textColor
    c.fillText(label, x, finalY)
  }
}

function renderDots(canvas: HTMLCanvasElement, c: CanvasRenderingContext2D) {
  const dotColor = theme.current.value.colors['surface-container-highest']!
  const x = canvas.width - PADDING.horizontal + DOT_RADIUS / 2

  for (const m of renderState.months) {
    c.fillStyle = dotColor
    c.beginPath()
    c.arc(x, yPos(m.y), DOT_RADIUS, 0, Math.PI * 2)
    c.fill()
  }
}

// --- Resize Handler ---
function resizeCanvas() {
  const canvas = canvasRef.value
  const container = containerRef.value
  if (!canvas || !container) return

  const dpr = window.devicePixelRatio || 1
  const rect = container.getBoundingClientRect()

  canvas.width = rect.width * dpr
  canvas.height = rect.height * dpr

  canvas.style.width = `${rect.width}px`
  canvas.style.height = `${rect.height}px`

  if (ctx.value) ctx.value.setTransform(dpr, 0, 0, dpr, 0, 0)

  renderOnce()
}

// --- Watchers ---
watch(
  () => props.scrollY,
  () => {
    renderOnce()
  },
)

watch(
  () => props.months,
  () => {
    renderState = buildRenderState()
    renderOnce()
  },
)

watch(hovering, (isHovering) => {
  if (isHovering) {
    startRender()
  } else {
    renderOnce()
  }
})

// --- Lifecycle ---
onMounted(() => {
  window.addEventListener('resize', resizeCanvas)
  renderState = buildRenderState()
  resizeCanvas()
})

onUnmounted(() => {
  window.removeEventListener('resize', resizeCanvas)
  cancelRender()
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
}

.timeline-canvas {
  display: block;
  touch-action: none;
}
</style>
