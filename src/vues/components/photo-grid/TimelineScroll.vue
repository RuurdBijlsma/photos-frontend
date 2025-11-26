<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import type { TimelineMonth } from '@/scripts/types/generated/photos.ts'
import { useTheme } from 'vuetify/framework'
import { MONTHS } from '@/scripts/constants.ts'

const vuetifyTheme = useTheme()

const props = defineProps<{
  months: TimelineMonth[] | undefined | null
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
const containerRef = ref<HTMLElement | null>(null)
const context = computed(() => {
  if (canvasRef.value) {
    return canvasRef.value.getContext('2d')
  }
  return null
})
let needsRender = true
const verticalPadding = 15
const horizontalPadding = 10
const fontSize = 12
const fontFamily = 'Montserrat'
const dotRadius = 2

const parseMonthId = (monthId: string) => {
  const parts = monthId.split('-')
  if (parts.length !== 3) {
    return { year: 0, month: 0, day: 0 }
  }
  return { year: Number(parts[0]), month: Number(parts[1]), day: Number(parts[2]) }
}

interface RenderState {
  years: { year: string; y: number }[]
  months: { month: string; y: number }[]
}

const calculateRenderState = (): RenderState => {
  const timelineMonths = props.months
  if (!timelineMonths) return { years: [], months: [] }
  let totalItems = 0
  for (const timelineMonth of timelineMonths) {
    totalItems += timelineMonth.count
  }
  const result: RenderState = {
    years: [],
    months: [],
  }
  let shownYear = -1
  let itemCount = 0
  for (const timelineMonth of timelineMonths) {
    const date = parseMonthId(timelineMonth.monthId)
    if (date.year != shownYear) {
      result.years.push({
        year: date.year,
        y: itemCount / totalItems,
      })
      shownYear = date.year
    }

    result.months.push({
      month: `${MONTHS[date.month - 1].substring(0, 3)} ${date.year}`,
      y: itemCount / totalItems,
    })

    itemCount += timelineMonth.count
  }
  console.log('RenderState', result)
  needsRender = true
  return result
}

let renderState = calculateRenderState()
const updateRenderState = () => (renderState = calculateRenderState())

const yPos = (v: number) => {
  const canvasHeight = canvasRef.value?.height
  if (!canvasHeight) return 0
  return verticalPadding + v * (canvasHeight - verticalPadding * 2)
}

const renderYears = (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => {
  let prevTextY = -Infinity
  const minimumDistance = fontSize + 10

  for (let i = 0; i < renderState.years.length; i++) {
    const renderYear = renderState.years[i]!
    const yearStr = renderYear.year.toString()
    const textSize = ctx.measureText(yearStr)
    const textX = canvas.width - textSize.width - horizontalPadding
    let textY = yPos(renderYear.y)
    // Prevent overlap
    if (i !== renderState.years.length - 1 && i > 0 && textY - prevTextY < minimumDistance) continue
    if (i == renderState.years.length - 1 && i > 0) {
      const distY = textY - prevTextY
      if (distY < minimumDistance) {
        textY += minimumDistance - distY
      }
    }
    prevTextY = textY

    // Draw year backdrop (rounded rect)
    ctx.beginPath()
    ctx.fillStyle = vuetifyTheme.current.value.colors['surface-container']
    ctx.roundRect(textX - 7, textY - fontSize - 4, textSize.width + 14, fontSize + 10, 10)
    ctx.fill()

    // Draw year text
    ctx.fillStyle = vuetifyTheme.current.value.colors['on-background'] + 'bb'
    ctx.fillText(yearStr, textX, textY)
  }
}

const renderDots = (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => {
  for (const renderMonth of renderState.months) {
    const y = yPos(renderMonth.y)
    ctx.fillStyle = vuetifyTheme.current.value.colors['surface-container-highest']
    ctx.beginPath()
    ctx.arc(canvas.width - horizontalPadding, y, dotRadius, 0, Math.PI * 2)
    ctx.fill()
  }
}

let render = () => {}
render = () => {
  const canvas = canvasRef.value
  const container = containerRef.value
  const ctx = context.value
  if (!canvas || !container || !ctx) return
  requestAnimationFrame(render)
  if (!needsRender) return
  needsRender = false
  console.log('RENDERING')
  ctx.font = `${fontSize}px ${fontFamily}, Arial, sans-serif`
  renderDots(canvas, ctx)
  renderYears(canvas, ctx)
}

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
  if (context.value) context.value.scale(dpr, dpr)

  // Set visible size
  canvas.style.width = `${rect.width}px`
  canvas.style.height = `${rect.height}px`

  needsRender = true
}

// Watch for data changes to redraw
watch(
  () => props.months,
  () => {
    updateRenderState()
    needsRender = true
  },
)

onMounted(() => {
  window.addEventListener('resize', resizeCanvas)
  setTimeout(resizeCanvas, 50)
  requestIdleCallback(render)
})

onUnmounted(() => {
  window.removeEventListener('resize', resizeCanvas)
})
</script>

<template>
  <div ref="containerRef" class="timeline-container">
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
