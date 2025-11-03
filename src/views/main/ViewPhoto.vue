<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import photoService from '@/script/services/photoService.ts'
import { useThemeStore } from '@/stores/themeStore.ts'
import { useTheme } from 'vuetify/framework'
import { useMediaStore } from '@/stores/mediaStore.ts'
import { useViewStore } from '@/stores/viewStore.ts'
import { useSettingStore } from '@/stores/settingsStore.ts'

const mediaStore = useMediaStore()
const viewStore = useViewStore()
const themeStore = useThemeStore()
const settings = useSettingStore()
const vuetifyTheme = useTheme()
const route = useRoute()
const router = useRouter()

const id = computed(() => {
  const rawId = route.params.id
  if (rawId && !Array.isArray(rawId)) return rawId
  console.warn('WEIRD ID IN ROUTE DETECTED')
  return ''
})

console.log('route', route)

async function initialize() {
  await mediaStore.fetchItem(id.value)
  if (id.value === null) return
  const fullImage = mediaStore.cache.get(id.value)
  if (fullImage === undefined) return
  const imageTheme = fullImage.visual_analyses[0]?.colors?.themes?.[0]
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
  console.log(e.key)
  if (e.key === 'ArrowLeft') {
    router.push({ path: `/view/${prevId.value}` })
  } else if (e.key === 'ArrowRight') {
    router.push({ path: `/view/${nextId.value}` })
  }
}
onMounted(() => document.addEventListener('keydown', handleKeyDown))
onUnmounted(() => document.removeEventListener('keydown', handleKeyDown))

const imageUrl = computed(() => photoService.getPhotoThumbnail(id.value, 1440))

// Init
watch(id, () => {
  initialize()
})
initialize()
viewStore.setFromRoute()
</script>

<template>
  <v-theme-provider class="theme-prov" theme="darkView">
    <div class="view-container" :style="{
      backgroundColor: settings.useImageGlow ? 'rgb(var(--v-theme-background))' : 'black',
    }">
      <div
        v-if="settings.useImageGlow"
        class="blurry-bg"
        :style="{
          backgroundImage: `url(${imageUrl})`,
        }"
      ></div>
      <img class="image-tag" :src="imageUrl" alt="Full size image" />
      <router-link
        :to="`/view/${prevId}`"
        v-if="prevId !== null"
        class="prev-area"
        @mouseenter="showLeftButton = true"
        @mouseleave="showLeftButton = false"
      >
        <v-btn
          :style="{ opacity: showLeftButton ? 1 : 0 }"
          icon="mdi-chevron-left"
          color="secondary"
        ></v-btn>
      </router-link>
      <router-link
        :to="`/view/${nextId}`"
        v-if="nextId !== null"
        class="next-area"
        @mouseenter="showRightButton = true"
        @mouseleave="showRightButton = false"
      >
        <v-btn
          :style="{ opacity: showRightButton ? 1 : 0 }"
          icon="mdi-chevron-right"
          color="secondary"
        ></v-btn>
      </router-link>
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
  background-color: red;
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

.next-area {
  position: absolute;
  right: 0;
  top: 70px;
  height: calc(100% - 140px);
  width: 20%;
  min-width: 92px;
  max-width: 150px;
  z-index: 3001;
  cursor: pointer;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  padding: 20px;
}

.prev-area {
  position: absolute;
  left: 0;
  top: 70px;
  height: calc(100% - 140px);
  width: 20%;
  min-width: 92px;
  max-width: 150px;
  z-index: 3001;
  cursor: pointer;
  display: flex;
  justify-content: flex-start;
  align-items: center;
  padding: 20px;
}
</style>
