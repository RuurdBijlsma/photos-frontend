<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { computed, ref, watch } from 'vue'
import { useAlbumStore } from '@/scripts/stores/albumStore.ts'
import mediaItemService from '@/scripts/services/mediaItemService.ts'
import GlowImage from '@/vues/components/ui/GlowImage.vue'
import { useDebounceFn } from '@vueuse/core'
import EditableTitle from '@/vues/components/ui/EditableTitle.vue'
import SimpleTimeline from '@/vues/components/simple-timeline/SimpleTimeline.vue'

const route = useRoute()
const router = useRouter()
const albumStore = useAlbumStore()

const id = computed(() => {
  const rawId = route.params.albumId
  if (rawId && !Array.isArray(rawId)) return rawId
  console.warn('WEIRD ALBUM ID IN ROUTE DETECTED')
  return null
})
const albumResponse = computed(() => {
  if (!id.value) return null
  return albumStore.albumMedia.get(id.value) ?? null
})
const minimalAlbumInfo = computed(() => albumStore.userAlbums.find((a) => a.id === id.value))
const album = computed(() => albumResponse.value?.album ?? null)
const items = computed(() => albumResponse.value?.items ?? [])
const updateAlbumTitleDb = useDebounceFn(updateAlbumTitle, 500)
const albumTitle = ref<string | null>(null)
const description = computed(() => {
  if (album.value !== null) return album.value?.description ?? null
  return minimalAlbumInfo.value?.description ?? null
})
const thumbnailId = computed(() => {
  if (album.value !== null) return album.value?.thumbnailId ?? null
  return minimalAlbumInfo.value?.thumbnailId ?? null
})

function updateAlbumTitle(name: string) {
  if (album.value === null || id.value === null) return
  if (album.value.name === name) return
  const create = route.query?.create
  if (create === '1') {
    const newQuery = { ...route.query }
    delete newQuery.create
    router.replace({ query: newQuery })
  }
  album.value.name = name
  albumStore.updateAlbumDetails(id.value, { name })
}

watch(
  id,
  async () => {
    albumTitle.value = null
    console.log('ID CHANGE', id.value)
    if (!id.value) return
    await albumStore.fetchAlbumMedia(id.value)
    albumTitle.value = album.value?.name ?? ''
  },
  { immediate: true },
)

watch(minimalAlbumInfo, () => {
  if (!id.value) return
  if (!minimalAlbumInfo.value) return
  if (albumTitle.value !== null) return
  albumTitle.value = minimalAlbumInfo.value.name
})

watch(albumTitle, (newVal, oldVal) => {
  if (newVal && newVal !== oldVal) updateAlbumTitleDb(newVal)
})

watch(
  () => album.value?.name,
  () => {
    const name = album.value?.name ?? null
    if (name === null) return
    albumTitle.value = name
  },
)
</script>

<template>
  <simple-timeline :timeline-items="items">
    <div class="album-header">
      <div class="album-header-left">
        <glow-image
          border-radius="44px"
          :height="222"
          :src="mediaItemService.getPhotoThumbnail(thumbnailId, 720)"
        ></glow-image>
      </div>
      <div class="album-header-right">
        <editable-title
          v-if="albumTitle !== null"
          name="album title"
          :autofocus="route.query?.create === '1'"
          v-model="albumTitle"
        />

        <p v-if="description">{{ description }}</p>
      </div>
    </div>
  </simple-timeline>
</template>

<style scoped>
.album-header {
  display: flex;
  width: 100%;
}

.album-header-left {
  padding: 10px;
}

.album-header-right {
  padding: 20px;
  flex-grow: 1;
}
</style>
