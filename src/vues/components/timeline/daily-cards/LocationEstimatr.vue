<script setup lang="ts">
import { ref, computed, watch, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useWindowSize } from '@vueuse/core'
import type { DailyCardResponse } from '@/scripts/types/api/dailyCards.ts'
import { getThumbnailHeight, getVideoHeight, useObjStorage } from '@/scripts/utils.ts'
import mediaItemService from '@/scripts/services/mediaItemService.ts'
import BaseMap from '@/vues/components/map/BaseMap.vue'
import type { StyleName } from '@/vues/components/map/BaseMap.vue'
import maplibregl from 'maplibre-gl'

const props = defineProps<{
  card: DailyCardResponse
}>()

const router = useRouter()
const windowSize = useWindowSize()

export interface EstimatrRound {
  latitude: number
  longitude: number
  mediaItem: {
    id: string
    isVideo: boolean
    isPanorama: boolean
    hasThumbnails: boolean
    width: number
    height: number
    ratio: number
    durationMs: number | null
    takenAtLocal: string
  }
}

export interface EstimatrPayload {
  rounds: EstimatrRound[]
  areaKm2: number
}

interface RoundGuess {
  guessedLat: number
  guessedLng: number
  actualLat: number
  actualLng: number
  distanceKm: number
  score: number
}

interface GameState {
  cardId: number
  currentRoundIndex: number
  status: 'playing' | 'guessed' | 'finished'
  guesses: (RoundGuess | null)[]
}

const payload = computed(() => props.card.payload as unknown as EstimatrPayload)
const rounds = computed(() => payload.value?.rounds || [])
const areaKm2 = computed(() => payload.value?.areaKm2 || 0)

// Game State persisted via local storage
const gameState = useObjStorage<GameState>(`estimatr_state_${props.card.id}`, {
  cardId: props.card.id,
  currentRoundIndex: 0,
  status: 'playing',
  guesses: [],
})

if (!gameState.value || gameState.value.cardId !== props.card.id) {
  gameState.value = {
    cardId: props.card.id,
    currentRoundIndex: 0,
    status: 'playing',
    guesses: Array(rounds.value.length).fill(null),
  }
}

// User active marker guess coordinates
const tempGuess = ref<{ lat: number; lng: number } | null>(null)

// Map parameters and reactive drag-resize coordinates
const mapInstance = ref<maplibregl.Map | null>(null)
const mapStyle = ref<StyleName>('LIBERTY')

const mapWidth = ref(440) // Generous starting map size
const mapHeight = ref(330)

const minWidth = 320
const maxWidth = 800
const minHeight = 240
const maxHeight = 600

let isResizing = false
let startX = 0
let startY = 0
let startWidth = 0
let startHeight = 0

// Stable map options to prevent viewport resets when switching style layers
const stableMapOptions = {
  center: { lon: 0, lat: 0 },
  zoom: 1.5,
  attributionControl: {
    compact: true,
  },
}

// Marker handles
let guessMarker: maplibregl.Marker | null = null
let actualMarker: maplibregl.Marker | null = null
const summaryMarkers: maplibregl.Marker[] = []
const summaryLineLayers: string[] = []

const currentRound = computed<EstimatrRound | null>(() => {
  if (rounds.value.length === 0) return null
  return rounds.value[gameState.value.currentRoundIndex] || null
})

const currentMediaItem = computed(() => currentRound.value?.mediaItem || null)

const currentImageUrl = computed(() => {
  const item = currentMediaItem.value
  if (!item) return ''
  return mediaItemService.getPhotoThumbnail(
    item.id,
    getThumbnailHeight(windowSize.height.value),
    !item.hasThumbnails,
  )
})

const currentVideoUrl = computed(() => {
  const item = currentMediaItem.value
  if (!item) return ''
  return mediaItemService.getVideo(
    item.id,
    getVideoHeight(windowSize.height.value),
    !item.hasThumbnails,
  )
})

const totalScore = computed(() => {
  return gameState.value.guesses.reduce((sum, g) => sum + (g?.score || 0), 0)
})

const currentRoundGuess = computed(() => {
  return gameState.value.guesses[gameState.value.currentRoundIndex]
})

// Geodesic Interpolation helper for curved lines (Great Circle paths)
function getGreatCircleRoute(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number,
  pointsCount = 60,
): [number, number][] {
  const coords: [number, number][] = []

  const lat1 = (startLat * Math.PI) / 180
  const lon1 = (startLng * Math.PI) / 180
  const lat2 = (endLat * Math.PI) / 180
  const lon2 = (endLng * Math.PI) / 180

  const dLon = lon2 - lon1
  const dLat = lat2 - lat1

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const g = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  if (g === 0) {
    return [
      [startLng, startLat],
      [endLng, endLat],
    ]
  }

  for (let i = 0; i <= pointsCount; i++) {
    const f = i / pointsCount
    const A = Math.sin((1 - f) * g) / Math.sin(g)
    const B = Math.sin(f * g) / Math.sin(g)

    const x = A * Math.cos(lat1) * Math.cos(lon1) + B * Math.cos(lat2) * Math.cos(lon2)
    const y = A * Math.cos(lat1) * Math.sin(lon1) + B * Math.cos(lat2) * Math.sin(lon2)
    const z = A * Math.sin(lat1) + B * Math.sin(lat2)

    const lat = Math.atan2(z, Math.sqrt(x * x + y * y))
    const lon = Math.atan2(y, x)

    coords.push([(lon * 180) / Math.PI, (lat * 180) / Math.PI])
  }

  return coords
}

// Drag Resizing Logic for Bottom-Left Anchored Map
function startResize(e: MouseEvent) {
  isResizing = true
  startX = e.clientX
  startY = e.clientY
  startWidth = mapWidth.value
  startHeight = mapHeight.value

  document.addEventListener('mousemove', handleResize)
  document.addEventListener('mouseup', stopResize)
  e.preventDefault()
}

function handleResize(e: MouseEvent) {
  if (!isResizing) return
  const dx = e.clientX - startX
  const dy = startY - e.clientY

  mapWidth.value = Math.max(minWidth, Math.min(maxWidth, startWidth + dx))
  mapHeight.value = Math.max(minHeight, Math.min(maxHeight, startHeight + dy))

  if (mapInstance.value) {
    mapInstance.value.resize()
  }
}

function stopResize() {
  isResizing = false
  document.removeEventListener('mousemove', handleResize)
  document.removeEventListener('mouseup', stopResize)
}

function startResizeTouch(e: TouchEvent) {
  if (e.touches.length !== 1) return
  isResizing = true
  startX = e.touches[0].clientX
  startY = e.touches[0].clientY
  startWidth = mapWidth.value
  startHeight = mapHeight.value

  document.addEventListener('touchmove', handleResizeTouch)
  document.addEventListener('touchend', stopResizeTouch)
  e.preventDefault()
}

function handleResizeTouch(e: TouchEvent) {
  if (!isResizing || e.touches.length !== 1) return
  const dx = e.touches[0].clientX - startX
  const dy = startY - e.touches[0].clientY

  mapWidth.value = Math.max(minWidth, Math.min(maxWidth, startWidth + dx))
  mapHeight.value = Math.max(minHeight, Math.min(maxHeight, startHeight + dy))

  if (mapInstance.value) {
    mapInstance.value.resize()
  }
}

function stopResizeTouch() {
  isResizing = false
  document.removeEventListener('touchmove', handleResizeTouch)
  document.removeEventListener('touchend', stopResizeTouch)
}

// Distance & Score Calculations
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function calculateScore(distanceKm: number, areaKm2Value: number): number {
  let k = 2000
  if (areaKm2Value && areaKm2Value > 0) {
    k = Math.max(1, Math.sqrt(areaKm2Value) * 0.15)
  }
  const score = Math.round(5000 * Math.exp(-distanceKm / k))
  return Math.min(5000, Math.max(0, score))
}

function formatDistance(distKm: number): string {
  if (distKm < 1) {
    return `${Math.round(distKm * 1000)} m`
  }
  return `${distKm.toFixed(1)} km`
}

// Map Fitting bounds safety calculator (prevents crashes from extreme padding / small canvas)
function safeFitBounds(bounds: maplibregl.LngLatBounds, isFinishedState = false) {
  if (!mapInstance.value) return
  const map = mapInstance.value
  const canvas = map.getCanvas()
  if (!canvas) return

  const width = canvas.clientWidth
  const height = canvas.clientHeight

  if (isFinishedState) {
    // Finished state: Full-screen canvas. Use horizontal offset to avoid left-panel overlap
    const leftPad = width > 800 ? 480 : Math.round(width * 0.1)
    const rightPad = Math.round(width * 0.1)
    const topPad = Math.round(height * 0.12)
    const bottomPad = Math.round(height * 0.12)

    map.fitBounds(bounds, {
      padding: { top: topPad, bottom: bottomPad, left: leftPad, right: rightPad },
      maxZoom: 10,
      duration: 1200,
    })
  } else {
    // In-game state: Compact map container size. Keep padding safe and proportional
    const hPad = Math.min(50, Math.round(width * 0.12))
    const vPad = Math.min(50, Math.round(height * 0.12))

    map.fitBounds(bounds, {
      padding: { top: vPad, bottom: vPad, left: hPad, right: hPad },
      maxZoom: 14,
      duration: 1000,
    })
  }
}

// Map Loading & Drawing Trigger handlers
function handleMapLoad(loadedMap: maplibregl.Map) {
  mapInstance.value = loadedMap

  loadedMap.on('click', (e) => {
    if (gameState.value.status !== 'playing') return
    const { lng, lat } = e.lngLat
    tempGuess.value = { lat, lng }
    updateGuessMarker(lat, lng)
  })

  nextTick(() => {
    drawAllOnMap()
  })
}

function handleStyleLoad() {
  drawAllOnMap()
}

function toggleMapStyle() {
  mapStyle.value = mapStyle.value === 'LIBERTY' ? 'SATELLITE' : 'LIBERTY'
}

function updateGuessMarker(lat: number, lng: number) {
  if (!mapInstance.value) return

  if (!guessMarker) {
    const el = document.createElement('div')
    el.className = 'guess-pin-marker'
    el.innerHTML = `
      <div class="pin-ring"></div>
      <div class="pin-dot"></div>
    `
    guessMarker = new maplibregl.Marker({
      element: el,
      anchor: 'center',
    })
      .setLngLat([lng, lat])
      .addTo(mapInstance.value)
  } else {
    guessMarker.setLngLat([lng, lat])
  }
}

function updateActualMarker(lat: number, lng: number) {
  if (!mapInstance.value || !currentMediaItem.value) return

  const thumbUrl = mediaItemService.getPhotoThumbnail(
    currentMediaItem.value.id,
    144,
    !currentMediaItem.value.hasThumbnails,
  )

  if (!actualMarker) {
    const el = document.createElement('div')
    el.className = 'actual-pin-marker'

    const circle = document.createElement('div')
    circle.className = 'marker-circle'
    circle.style.backgroundImage = `url(${thumbUrl})`

    const triangle = document.createElement('div')
    triangle.className = 'marker-triangle'

    el.appendChild(circle)
    el.appendChild(triangle)

    // offset [0, -12] lifts the pin up so guess marker underneath is clearly visible
    actualMarker = new maplibregl.Marker({
      element: el,
      anchor: 'bottom',
      offset: [0, -25],
    })
      .setLngLat([lng, lat])
      .addTo(mapInstance.value)
  } else {
    actualMarker.setLngLat([lng, lat])
    const circle = actualMarker.getElement().querySelector('.marker-circle') as HTMLElement
    if (circle) {
      circle.style.backgroundImage = `url(${thumbUrl})`
    }
  }
}

function drawDottedLine(coord1: [number, number], coord2: [number, number]) {
  if (!mapInstance.value) return
  const map = mapInstance.value

  const curvedCoordinates = getGreatCircleRoute(coord1[1], coord1[0], coord2[1], coord2[0])

  const geojson = {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'LineString',
      coordinates: curvedCoordinates,
    },
  }

  if (map.getSource('route')) {
    ;(map.getSource('route') as maplibregl.GeoJSONSource).setData(geojson as any)
  } else {
    map.addSource('route', {
      type: 'geojson',
      data: geojson as any,
    })

    map.addLayer({
      id: 'route',
      type: 'line',
      source: 'route',
      layout: {
        'line-join': 'round',
        'line-cap': 'round',
      },
      paint: {
        'line-color': '#ff9f0a',
        'line-width': 3.5,
        'line-dasharray': [2, 2],
      },
    })
  }
}

function clearMapDrawings() {
  if (guessMarker) {
    guessMarker.remove()
    guessMarker = null
  }
  if (actualMarker) {
    actualMarker.remove()
    actualMarker = null
  }

  summaryMarkers.forEach((m) => m.remove())
  summaryMarkers.length = 0

  if (mapInstance.value) {
    const map = mapInstance.value
    if (map.style) {
      if (map.getLayer('route')) map.removeLayer('route')
      if (map.getSource('route')) map.removeSource('route')

      summaryLineLayers.forEach((lineId) => {
        if (map.getLayer(lineId)) map.removeLayer(lineId)
        if (map.getSource(lineId)) map.removeSource(lineId)
      })
    }
    summaryLineLayers.length = 0
  }
}

function drawAllOnMap() {
  if (!mapInstance.value) return
  const map = mapInstance.value

  clearMapDrawings()

  if (gameState.value.status === 'playing') {
    if (tempGuess.value) {
      updateGuessMarker(tempGuess.value.lat, tempGuess.value.lng)
    }
  } else if (gameState.value.status === 'guessed') {
    const currentGuess = currentRoundGuess.value
    if (currentGuess) {
      updateGuessMarker(currentGuess.guessedLat, currentGuess.guessedLng)
      updateActualMarker(currentGuess.actualLat, currentGuess.actualLng)
      drawDottedLine(
        [currentGuess.guessedLng, currentGuess.guessedLat],
        [currentGuess.actualLng, currentGuess.actualLat],
      )

      const bounds = new maplibregl.LngLatBounds()
      bounds.extend([currentGuess.guessedLng, currentGuess.guessedLat])
      bounds.extend([currentGuess.actualLng, currentGuess.actualLat])
      map.fitBounds(bounds, { padding: 80, maxZoom: 14, duration: 1000 })
    }
  } else if (gameState.value.status === 'finished') {
    const bounds = new maplibregl.LngLatBounds()
    let validGuesses = 0

    gameState.value.guesses.forEach((g, idx) => {
      if (!g) return
      validGuesses++

      const gEl = document.createElement('div')
      gEl.className = 'summary-marker guess-summary'
      gEl.innerHTML = `<span class="marker-label">${idx + 1}</span>`
      const gMarker = new maplibregl.Marker({ element: gEl, anchor: 'center' })
        .setLngLat([g.guessedLng, g.guessedLat])
        .addTo(map)
      summaryMarkers.push(gMarker)
      bounds.extend([g.guessedLng, g.guessedLat])

      const aEl = document.createElement('div')
      aEl.className = 'summary-marker actual-summary'
      aEl.innerHTML = `<span class="marker-label">${idx + 1}</span>`
      const aMarker = new maplibregl.Marker({ element: aEl, anchor: 'center' })
        .setLngLat([g.actualLng, g.actualLat])
        .addTo(map)
      summaryMarkers.push(aMarker)
      bounds.extend([g.actualLng, g.actualLat])

      // Great Circle curved connectors on final view
      const lineId = `line-summary-${idx}`
      const curveCoords = getGreatCircleRoute(g.guessedLat, g.guessedLng, g.actualLat, g.actualLng)

      map.addSource(lineId, {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: curveCoords,
          },
        },
      })
      map.addLayer({
        id: lineId,
        type: 'line',
        source: lineId,
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': '#30d158',
          'line-width': 2.5,
          'line-dasharray': [2, 2],
        },
      })
      summaryLineLayers.push(lineId)
    })

    if (validGuesses > 0) {
      nextTick(() => {
        safeFitBounds(bounds, true)
      })
    }
  }
}

function handleGuessClick() {
  if (!tempGuess.value || !currentRound.value) return

  const actualLat = currentRound.value.latitude
  const actualLng = currentRound.value.longitude
  const guessedLat = tempGuess.value.lat
  const guessedLng = tempGuess.value.lng

  const distance = haversineDistance(guessedLat, guessedLng, actualLat, actualLng)
  const score = calculateScore(distance, areaKm2.value)

  const updatedGuesses = [...gameState.value.guesses]
  updatedGuesses[gameState.value.currentRoundIndex] = {
    guessedLat,
    guessedLng,
    actualLat,
    actualLng,
    distanceKm: distance,
    score,
  }

  gameState.value = {
    ...gameState.value,
    guesses: updatedGuesses,
    status: 'guessed',
  }

  drawAllOnMap()
}

function nextRound() {
  const nextIdx = gameState.value.currentRoundIndex + 1
  if (nextIdx < rounds.value.length) {
    gameState.value = {
      ...gameState.value,
      currentRoundIndex: nextIdx,
      status: 'playing',
    }
    tempGuess.value = null
    clearMapDrawings()

    if (mapInstance.value) {
      mapInstance.value.setZoom(1.5)
      mapInstance.value.setCenter([0, 0])
    }
  } else {
    gameState.value = {
      ...gameState.value,
      status: 'finished',
    }
    drawAllOnMap()
  }
}

function goBack() {
  router.push('/')
}

watch(
  () => gameState.value.currentRoundIndex,
  () => {
    tempGuess.value = null
    nextTick(() => {
      drawAllOnMap()
    })
  },
)

onUnmounted(() => {
  // Try...catch wrapping ensures unmount hooks never freeze virtual routers
  try {
    clearMapDrawings()
  } catch (err) {
    console.error('Error clearing drawings on unmount:', err)
  }

  if (mapInstance.value) {
    try {
      mapInstance.value.remove()
    } catch (err) {
      console.error('Error removing map instance:', err)
    }
    mapInstance.value = null
  }
})
</script>

<template>
  <div class="estimatr-container" :class="{ 'finished-mode': gameState.status === 'finished' }">
    <!-- Top HUD Bar -->
    <div class="estimatr-header py-2">
      <div class="header-left">
        <v-btn icon="mdi-close" variant="text" color="white" size="small" @click="goBack" />
        <div class="header-titles ml-4">
          <h3>{{ card.title }}</h3>
          <p class="subtitle" v-if="card.subtitle">{{ card.subtitle }}</p>
        </div>
      </div>

      <div class="header-center py-2" v-if="gameState.status !== 'finished'">
        <v-chip color="primary" variant="flat" class="font-weight-bold px-6 py-4 chip-spacer">
          Round {{ gameState.currentRoundIndex + 1 }} / {{ rounds.length }}
        </v-chip>
      </div>

      <div class="header-right">
        <div class="score-display">
          <span class="label">Total Score</span>
          <span class="value">{{ totalScore }}</span>
        </div>
      </div>
    </div>

    <!-- Active Main Screen Presentation -->
    <div class="estimatr-main-content" v-if="gameState.status !== 'finished'">
      <!-- Media Player Viewer Box -->
      <div class="media-viewport">
        <div class="media-frame" v-if="currentMediaItem">
          <video
            v-if="currentMediaItem.isVideo"
            controls
            autoplay
            class="media-content"
            :src="currentVideoUrl"
          />
          <img v-else :src="currentImageUrl" class="media-content" alt="Guess Location target" />
        </div>
      </div>

      <!-- Corner Map Placement Overlay -->
      <div class="map-wrapper" :style="{ width: `${mapWidth}px`, height: `${mapHeight}px` }">
        <div class="map-inner-container">
          <base-map
            class="base-map"
            :map-style="mapStyle"
            :map-options="stableMapOptions"
            @load="handleMapLoad"
            @style-load="handleStyleLoad"
          />

          <!-- Custom Resizer drag Handle Anchor -->
          <div
            class="resize-handle"
            @mousedown="startResize"
            @touchstart="startResizeTouch"
            title="Drag to resize map"
          >
            <v-icon size="14" color="white">mdi-resize-bottom-right</v-icon>
          </div>

          <!-- Floating Map Style controls -->
          <div class="map-floating-controls">
            <v-btn
              size="x-small"
              color="surface"
              elevation="3"
              class="ma-1"
              :icon="mapStyle === 'SATELLITE' ? 'mdi-map' : 'mdi-earth'"
              @click="toggleMapStyle"
            />
          </div>

          <!-- Bottom Action Confirmation Board inside Map Area -->
          <div class="map-bottom-actions">
            <template v-if="gameState.status === 'playing'">
              <v-btn
                block
                color="primary"
                rounded="lg"
                height="44"
                :disabled="!tempGuess"
                @click="handleGuessClick"
              >
                {{ tempGuess ? 'Make Guess' : 'Place Marker On Map' }}
              </v-btn>
            </template>
            <template v-else-if="gameState.status === 'guessed'">
              <v-btn block color="success" rounded="lg" height="44" @click="nextRound">
                {{
                  gameState.currentRoundIndex + 1 === rounds.length ? 'View Results' : 'Next Round'
                }}
              </v-btn>
            </template>
          </div>
        </div>
      </div>

      <!-- Banner notification overlay for results of current round -->
      <transition name="slide-up">
        <div class="round-result-card" v-if="gameState.status === 'guessed' && currentRoundGuess">
          <div class="result-box">
            <div class="result-metric">
              <span class="metric-label">Distance</span>
              <span class="metric-value text-amber-accent-3">{{
                formatDistance(currentRoundGuess.distanceKm)
              }}</span>
            </div>
            <v-divider vertical class="mx-4 border-opacity-50" />
            <div class="result-metric">
              <span class="metric-label">Score</span>
              <span class="metric-value text-success">+{{ currentRoundGuess.score }}</span>
            </div>
          </div>
          <v-progress-linear
            color="success"
            height="6"
            rounded
            class="mt-3"
            :model-value="(currentRoundGuess.score / 5000) * 100"
          />
        </div>
      </transition>
    </div>

    <!-- Overall Completed Game Summary Screen Mode -->
    <div class="estimatr-summary-content" v-else>
      <!-- Background Map takes full screen -->
      <div class="full-summary-map-container">
        <base-map
          class="base-map"
          :map-style="mapStyle"
          :map-options="stableMapOptions"
          @load="handleMapLoad"
          @style-load="handleStyleLoad"
        />
        <div class="map-floating-controls">
          <v-btn
            size="x-small"
            color="surface"
            elevation="3"
            class="ma-1"
            :icon="mapStyle === 'SATELLITE' ? 'mdi-map' : 'mdi-earth'"
            @click="toggleMapStyle"
          />
        </div>
      </div>

      <!-- Floating summary statistics panel on left hand side -->
      <div class="summary-details-panel">
        <v-card class="summary-details-card pa-6" elevation="10" rounded="xl" width="100%">
          <div class="text-center mb-6">
            <v-icon size="48" color="success" class="mb-2">mdi-check-circle-outline</v-icon>
            <h2>Challenge Completed!</h2>
            <p class="text-subtitle-2 text-disabled">
              Great work. Your daily score has been registered.
            </p>
          </div>

          <!-- Total Score Ring representation -->
          <div class="score-circle-container mb-6">
            <div class="score-ring">
              <span class="score-num">{{ totalScore }}</span>
              <span class="score-label">pts total</span>
            </div>
          </div>

          <!-- Individual Rounds Breakdowns lists -->
          <div class="rounds-summary-list mb-6">
            <div
              v-for="(guess, index) in gameState.guesses.filter((g) => g)"
              :key="index"
              class="round-row pa-3 mb-2"
            >
              <div class="round-number">
                <v-avatar
                  color="primary"
                  size="26"
                  class="text-subtitle-2 font-weight-bold text-white"
                >
                  {{ index + 1 }}
                </v-avatar>
              </div>
              <div class="round-thumbnail-wrapper mx-3">
                <img
                  v-if="rounds[index]"
                  class="round-thumb"
                  :src="
                    mediaItemService.getPhotoThumbnail(
                      rounds[index].mediaItem.id,
                      144,
                      !rounds[index].mediaItem.hasThumbnails,
                    )
                  "
                />
              </div>
              <div class="round-data flex-grow-1">
                <div class="text-caption text-disabled">Round {{ index + 1 }}</div>
                <div class="text-body-2 font-weight-bold">
                  {{ formatDistance(guess.distanceKm) }} away
                </div>
              </div>
              <div class="round-pts text-success font-weight-bold text-body-1">
                +{{ guess.score }}
              </div>
            </div>
          </div>

          <!-- Bottom Action Row -->
          <div class="summary-actions">
            <v-btn block color="primary" size="large" rounded="lg" class="mb-2" @click="goBack">
              Complete & Return
            </v-btn>
          </div>
        </v-card>
      </div>
    </div>
  </div>
</template>

<style scoped>
.estimatr-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: #0c0c0e;
  color: #ffffff;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  font-family: inherit;
}

/* Header HUD Styling */
.estimatr-header {
  height: 72px;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.85) 0%, rgba(0, 0, 0, 0) 100%);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  z-index: 101;
}

.header-left {
  display: flex;
  align-items: center;
}

.header-titles h3 {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 600;
}

.header-titles .subtitle {
  margin: 0;
  font-size: 0.85rem;
  opacity: 0.7;
}

.chip-spacer {
  margin: 4px 12px;
  letter-spacing: 0.5px;
}

.score-display {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.score-display .label {
  font-size: 0.75rem;
  text-transform: uppercase;
  opacity: 0.6;
  letter-spacing: 0.5px;
}

.score-display .value {
  font-size: 1.3rem;
  font-weight: 700;
  color: #ff9f0a;
}

/* Playing Mode Screen Framework */
.estimatr-main-content {
  flex-grow: 1;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: calc(100% - 72px);
}

.media-viewport {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
  padding: 24px;
}

.media-frame {
  width: 100%;
  height: 100%;
  max-width: 1000px;
  max-height: calc(100% - 40px);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 12px 36px rgba(0, 0, 0, 0.6);
  background-color: #000;
}

.media-content {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

/* Draggable Map Wrapper Base Box */
.map-wrapper {
  position: absolute;
  bottom: 24px;
  left: 24px;
  z-index: 10;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.65);
  background-color: rgb(var(--v-theme-surface));
  border: 1.5px solid rgba(255, 255, 255, 0.15);
  box-sizing: border-box;
}

.map-inner-container {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.base-map {
  flex-grow: 1;
  width: 100%;
  height: 100%;
}

/* Top Right Corner Resizer Handle style */
.resize-handle {
  position: absolute;
  top: 0;
  right: 0;
  width: 28px;
  height: 28px;
  background-color: rgba(var(--v-theme-surface), 0.95);
  border-bottom-left-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: ne-resize;
  z-index: 15;
  border-left: 1px solid rgba(255, 255, 255, 0.12);
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: -2px 2px 6px rgba(0, 0, 0, 0.35);
  touch-action: none;
  transition: background-color 0.2s;
}

.resize-handle:hover {
  background-color: rgba(var(--v-theme-primary), 0.95);
}

.map-floating-controls {
  position: absolute;
  top: 36px;
  right: 8px;
  display: flex;
  flex-direction: column;
  z-index: 5;
}

.map-bottom-actions {
  padding: 10px 14px;
  background-color: rgba(var(--v-theme-surface), 0.95);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

/* Floating Banner showing round accuracy statistics */
.round-result-card {
  position: absolute;
  bottom: 24px;
  right: 24px;
  width: 340px;
  background-color: rgba(var(--v-theme-surface), 0.95);
  border: 1.5px solid rgba(255, 255, 255, 0.15);
  border-radius: 20px;
  padding: 16px;
  z-index: 10;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
}

.result-box {
  display: flex;
  align-items: center;
  justify-content: space-around;
}

.result-metric {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
}

.metric-label {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  opacity: 0.6;
  margin-bottom: 2px;
}

.metric-value {
  font-size: 1.25rem;
  font-weight: 700;
}

/* Game Completed Summary mode Layout CSS */
.estimatr-summary-content {
  flex-grow: 1;
  position: relative;
  display: flex;
  width: 100%;
  height: calc(100% - 72px);
}

.full-summary-map-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
}

.summary-details-panel {
  position: absolute;
  top: 24px;
  left: 24px;
  bottom: 24px;
  width: 440px;
  z-index: 2;
  display: flex;
}

.summary-details-card {
  background-color: rgba(var(--v-theme-surface), 0.95) !important;
  backdrop-filter: blur(12px);
  border: 1.5px solid rgba(255, 255, 255, 0.15);
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  max-height: 100%;
}

.score-circle-container {
  display: flex;
  justify-content: center;
}

.score-ring {
  width: 130px;
  height: 130px;
  border-radius: 50%;
  border: 4px solid #30d158;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 0 8px rgba(48, 209, 88, 0.15);
}

.score-num {
  font-size: 2.1rem;
  font-weight: 800;
  color: #30d158;
  line-height: 1;
}

.score-label {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  opacity: 0.6;
}

.rounds-summary-list {
  flex-grow: 1;
}

.round-row {
  display: flex;
  align-items: center;
  background-color: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  transition: transform 0.2s;
}

.round-row:hover {
  transform: translateX(4px);
  background-color: rgba(255, 255, 255, 0.08);
}

.round-thumbnail-wrapper {
  width: 44px;
  height: 44px;
  border-radius: 8px;
  overflow: hidden;
  background-color: #000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.round-thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* Animations for result cards transitions */
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.35s cubic-bezier(0.25, 0.8, 0.25, 1);
}
.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(100px);
  opacity: 0;
}

/* Mobile responsive scaling overrides */
@media (max-width: 960px) {
  .estimatr-summary-content {
    flex-direction: column-reverse;
  }
  .full-summary-map-container {
    height: 50%;
    top: auto;
    bottom: 0;
  }
  .summary-details-panel {
    top: 10px;
    left: 10px;
    right: 10px;
    bottom: calc(50% + 10px);
    width: auto;
  }
}

@media (max-width: 600px) {
  .map-wrapper {
    width: 280px !important;
    height: 220px !important;
    bottom: 12px;
    left: 12px;
  }
  .round-result-card {
    width: calc(100% - 24px);
    bottom: 12px;
    right: 12px;
  }
}
</style>

<style>
/*
  For generated MapLibre GL Markers
*/
.actual-pin-marker {
  width: 52px;
  height: 60px;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.45));
  pointer-events: none;
  box-sizing: border-box;
}

.marker-circle {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  border: 2px solid #30d158;
  background-color: rgba(20, 20, 24, 0.65);
  background-position: center;
  background-repeat: no-repeat;
  background-size: cover;
  box-sizing: border-box;
  box-shadow: 0 0 0 4px rgba(48, 209, 88, 0.25);
}

.marker-triangle {
  width: 0;
  height: 0;
  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
  border-top: 8px solid #30d158;
  margin-top: -1px;
}

/* Custom Interactive Guess Marker representation */
.guess-pin-marker {
  width: 24px;
  height: 24px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.pin-ring {
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 2px solid #ff9f0a;
  background-color: rgba(255, 159, 10, 0.25);
  animation: markerPulse 1.5s infinite ease-in-out;
}

.pin-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background-color: #ff9f0a;
  border: 1px solid #ffffff;
}

@keyframes markerPulse {
  0% {
    transform: scale(0.8);
    opacity: 1;
  }
  100% {
    transform: scale(1.6);
    opacity: 0;
  }
}

/* Game summary pinpoint stylings */
.summary-marker {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 0.8rem;
  color: #ffffff !important;
  border: 2px solid #ffffff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.45);
  box-sizing: border-box;
}

.guess-summary {
  background-color: #ff9f0a;
}

.actual-summary {
  background-color: #30d158;
}

.marker-label {
  line-height: 1;
  color: #ffffff !important;
}
</style>
