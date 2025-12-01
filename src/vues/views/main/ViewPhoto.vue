<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import photoService from '@/scripts/services/photoService.ts'
import { useThemeStore } from '@/scripts/stores/themeStore.ts'
import { useTheme } from 'vuetify/framework'
import { useMediaStore } from '@/scripts/stores/mediaStore.ts'
import { useViewStore } from '@/scripts/stores/viewStore.ts'
import { useSettingStore } from '@/scripts/stores/settingsStore.ts'
import type { FullMediaItem } from '@/scripts/types/api/fullPhoto.ts'

const mediaStore = useMediaStore()
const viewStore = useViewStore()
const themeStore = useThemeStore()
const settings = useSettingStore()
const vuetifyTheme = useTheme()
const route = useRoute()
const router = useRouter()

const id = computed(() => {
  const rawId = route.params.id
  console.log('ID RIGHT NOW: ', rawId)
  if (rawId && !Array.isArray(rawId)) return rawId
  console.warn('WEIRD ID IN ROUTE DETECTED')
  return ''
})

const fullImage = ref<undefined | FullMediaItem>(undefined)

async function initialize() {
  const loadingId = id.value
  if (loadingId === '') return router.push({ name: 'timeline' })
  await mediaStore.fetchItem(loadingId)
  if (id.value !== loadingId) return
  console.log('FULL MEDIA ITEM', mediaStore.cache.get(loadingId))
  fullImage.value = mediaStore.cache.get(loadingId)
  const imageTheme = fullImage.value?.visual_analyses[0]?.colors?.themes?.[0]
  if (!imageTheme) return
  const vTheme = themeStore.themeFromJson(imageTheme)
  if (vuetifyTheme.themes.value.darkView && vTheme?.dark.colors) {
    //@ts-expect-error Error
    vuetifyTheme.themes.value.darkView.colors = vTheme?.dark.colors
  }
  if (vuetifyTheme.themes.value.lightView && vTheme?.light.colors) {
    //@ts-expect-error Error
    vuetifyTheme.themes.value.lightView.colors = vTheme?.light.colors
  }
}

const showRightButton = ref(false)
const showLeftButton = ref(false)

const currentIndex = computed(() => viewStore.orderedIds.findIndex((arrId) => id.value === arrId))
const nextId = computed(() => viewStore.orderedIds[currentIndex.value + 1] ?? null)
const prevId = computed(() => viewStore.orderedIds[currentIndex.value - 1] ?? null)

// Pre-fetch
watch(prevId, () => mediaStore.fetchItem(prevId.value))
watch(nextId, () => mediaStore.fetchItem(nextId.value))

function handleKeyDown(e: KeyboardEvent) {
  if (e.key === 'ArrowLeft' && prevId.value) {
    router.replace({ path: `/view/${prevId.value}` })
  } else if (e.key === 'ArrowRight' && nextId.value) {
    router.replace({ path: `/view/${nextId.value}` })
  } else if (e.key === 'Escape') {
    router.replace({ path: parentPath.value })
  }
}
onMounted(() => document.addEventListener('keydown', handleKeyDown))
onUnmounted(() => document.removeEventListener('keydown', handleKeyDown))

const imageUrl = computed(() => photoService.getPhotoThumbnail(id.value, 1440))

const timestampString = computed(() => {
  const dateStr = fullImage.value?.taken_at_local
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const day = date.getDate()
  const month = date.toLocaleString('en-GB', { month: 'long' })
  const year = date.getFullYear()

  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')

  return `${day} ${month} ${year} at ${hours}:${minutes}`
})

const locationString = computed(() => {
  if (!fullImage.value?.gps?.location) return ''
  const location = fullImage.value.gps.location
  let finalParts
  if (location.name && location.admin1) {
    finalParts = [location.name, location.admin1]
  } else {
    const prioritizedParts = [
      location.name,
      location.admin2,
      location.admin1,
      location.country_name,
    ]
    finalParts = prioritizedParts.filter((part) => part).slice(0, 2)
  }
  const result = finalParts.join(' - ')
  return result ? result + ' · ' : ''
})

const parentPath = computed(() => {
  const pathSegments = route.path.split('/')
  const parentSegments = pathSegments.slice(0, -2)
  return parentSegments.join('/') || '/'
})

// Init
watch(id, () => {
  initialize()
})
initialize()
viewStore.setFromRoute()
</script>

<template>
  <v-theme-provider class="theme-prov" theme="darkView">
    <div
      :class="{ 'backdrop-blur': settings.useBackdropBlur }"
      class="view-container"
      :style="{
        backgroundColor: settings.useImageGlow ? 'rgb(var(--v-theme-background))' : 'black',
      }"
    >
      <div
        v-if="settings.useImageGlow"
        class="blurry-bg"
        :style="{
          backgroundImage: `url(${imageUrl})`,
        }"
      ></div>
      <img class="image-tag" :src="imageUrl" alt="Full size image" />
      <div class="top-bar">
        <div class="left-buttons">
          <v-btn
            :to="parentPath"
            color="white"
            rounded
            icon="mdi-close"
            variant="plain"
            v-tooltip="{ text: 'Close viewer', location: 'bottom', attach: true, width: 140 }"
          />
          <v-btn
            color="white"
            rounded
            icon="mdi-view-gallery-outline"
            variant="plain"
            v-tooltip="{ text: 'Toggle gallery', location: 'bottom', attach: true, width: 140 }"
          />
        </div>
        <div class="top-main-text">
          <h3>{{ timestampString }}</h3>
          <p>
            {{ locationString }}{{ currentIndex + 1 }} of
            {{ viewStore.orderedIds.length }}
          </p>
        </div>
        <div class="right-buttons">
          <v-btn
            color="white"
            rounded
            icon="mdi-information-outline"
            variant="plain"
            v-tooltip="{ text: 'Extra info', location: 'bottom', attach: true, width: 140 }"
          />
          <v-btn
            color="white"
            rounded
            icon="mdi-share-variant-outline"
            variant="plain"
            v-tooltip="{ text: 'Share', location: 'bottom', attach: true, width: 140 }"
          />
          <v-btn
            color="white"
            rounded
            icon="mdi-heart-outline"
            variant="plain"
            v-tooltip="{ text: 'Favourite', location: 'bottom', attach: true, width: 140 }"
          />
          <v-btn
            color="white"
            rounded
            icon="mdi-cloud-download-outline"
            variant="plain"
            v-tooltip="{ text: 'Download', location: 'bottom', attach: true, width: 140 }"
          />
          <v-btn
            color="white"
            rounded
            icon="mdi-trash-can-outline"
            variant="plain"
            v-tooltip="{ text: 'Move to bin', location: 'bottom', attach: true, width: 140 }"
          />
          <v-btn
            color="white"
            rounded
            icon="mdi-dots-horizontal"
            variant="plain"
            v-tooltip="{ text: 'More options', location: 'bottom', attach: true, width: 140 }"
          />
        </div>
      </div>
      <div
        @click="router.replace({ path: `/view/${prevId}` })"
        v-if="prevId !== null"
        class="prev-area"
        @mouseenter="showLeftButton = true"
        @mouseleave="showLeftButton = false"
      >
        <v-btn
          :style="{ opacity: showLeftButton ? 1 : 0 }"
          icon="mdi-chevron-left"
          variant="flat"
          rounded
          color="background"
        ></v-btn>
      </div>
      <div
        @click="router.replace({ path: `/view/${nextId}` })"
        v-if="nextId !== null"
        class="next-area"
        @mouseenter="showRightButton = true"
        @mouseleave="showRightButton = false"
      >
        <v-btn
          :style="{ opacity: showRightButton ? 1 : 0 }"
          icon="mdi-chevron-right"
          variant="flat"
          rounded
          color="background"
        ></v-btn>
      </div>
    </div>
  </v-theme-provider>
</template>

<style scoped>
.theme-prov {
  position: fixed;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  z-index: 2400;
}

.view-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 2400;
}

.blurry-bg {
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  background-size: contain;
  background-position: center;
  filter: blur(50px) brightness(60%);
}

.image-tag {
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  object-fit: contain;
  z-index: 3000;
}

.top-bar {
  position: absolute;
  width: 100%;
  height: 60px;
  display: flex;
  z-index: 3001;
  background-color: rgba(20, 20, 20, 0.8);
  box-shadow: 0 3px 12px rgba(0, 0, 0, 0.15);
  justify-content: space-between;
}

.backdrop-blur .top-bar {
  backdrop-filter: blur(30px) saturate(150%) brightness(90%) contrast(90%);
  background-color: rgba(20, 20, 20, 0.5);
}

.left-buttons {
  display: flex;
  align-items: center;
  padding-left: 20px;
  gap: 1px;
  width: 313px;
}

.top-main-text {
  display: flex;
  text-align: center;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  font-family: Jost, sans-serif;
  line-height: 0.9;
}

.top-main-text h3 {
  font-weight: 500;
  margin-bottom: 5px;
  font-size: 16px;
}

.top-main-text p {
  font-weight: 300;
  color: rgba(255, 255, 255, 0.6);
  font-size: 13px;
}

.right-buttons {
  display: flex;
  align-items: center;
  padding-right: 20px;
  gap: 1px;
  width: 313px;
}

.next-area {
  position: absolute;
  right: 0;
  top: 70px;
  height: calc(100% - 140px);
  width: 20%;
  min-width: 92px;
  max-width: 150px;
  cursor: pointer;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  padding: 20px;
  z-index: 3002;
}

.prev-area {
  position: absolute;
  left: 0;
  top: 70px;
  height: calc(100% - 140px);
  width: 20%;
  min-width: 92px;
  max-width: 150px;
  cursor: pointer;
  display: flex;
  justify-content: flex-start;
  align-items: center;
  padding: 20px;
  z-index: 3002;
}
</style>
