<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { useAlbumStore } from '@/scripts/stores/albumStore.ts'
import { computed, ref, watch } from 'vue'
import { useDebounceFn, useTextareaAutosize } from '@vueuse/core'
import TimelineContainer from '@/vues/components/media-timeline/TimelineContainer.vue'
import photoService from '@/scripts/services/photoService.ts'

const route = useRoute()
const router = useRouter()
const albumStore = useAlbumStore()

const id = computed(() => route.params.albumId as string)
const controller = computed(() => albumStore.controllerCache.get(id.value))
const album = computed(() => controller.value?.albumInfo)

const { textarea, input: localTitle } = useTextareaAutosize()
const isFocused = ref(false)

watch(id, () => albumStore.createController(id.value), { immediate: true })
watch(
  controller,
  () => {
    controller.value?.preFetch()
  },
  { immediate: true },
)

watch(
  () => album.value?.name,
  (newStoreName) => {
    if (!isFocused.value) {
      localTitle.value = newStoreName || ''
    }
  },
  { immediate: true },
)

watch(textarea, (el) => {
  if (el && route.query.create === '1') {
    el.focus()
    el.select()
    const newQuery = { ...route.query }
    delete newQuery.create
    router.replace({ query: newQuery })
  }
})

const saveTitle = async (val: string) => {
  if (!id.value) return
  const cleanTitle = val.trim()

  if (cleanTitle !== (album.value?.name || '')) {
    await albumStore.updateAlbumDetails(id.value, { name: cleanTitle })
  }
}

const debouncedUpdate = useDebounceFn(saveTitle, 800)

const onInput = () => {
  debouncedUpdate(localTitle.value)
}

const onEnter = (e: KeyboardEvent) => {
  ;(e.target as HTMLTextAreaElement).blur()
}
</script>

<template>
  <timeline-container
    v-if="controller"
    class="album-timeline"
    :timeline-controller="controller"
    sort-direction="desc"
  >
    <div class="album-summary" v-if="album">
      <div class="album-thumbnail">
        <img
          alt="Album thumbnail"
          width="400"
          v-if="album.thumbnailId"
          :src="photoService.getPhotoThumbnail(album.thumbnailId, 720)"
        />
      </div>
      <div class="album-summary-text">
        <textarea
          ref="textarea"
          class="editable-title"
          v-model="localTitle"
          rows="1"
          placeholder="Unnamed"
          spellcheck="false"
          @input="onInput"
          @focus="isFocused = true"
          @blur="isFocused = false"
          @keydown.enter.prevent="onEnter"
        ></textarea>
        <p v-if="album.description">{{ album.description }}</p>
      </div>
    </div>
  </timeline-container>
</template>

<style scoped>
.album-timeline {
  width: 100%;
  height: 100%;
}

.album-summary {
  display: flex;
  padding-top: 7px;
  min-height: 216px;
}

.album-thumbnail {
  display: flex;
  align-items: center;
}

.album-thumbnail > * {
  border-radius: 30px;
}

.album-summary-text {
  padding: 20px;
  flex-grow: 1;
  min-width: 0;
}

.editable-title {
  background: transparent;
  border: none;
  outline: none;
  margin: 0;
  resize: none;
  overflow: hidden;
  font-family: inherit;
  font-weight: 400;
  font-size: 40px;
  line-height: 1.2;
  color: inherit;
  width: 100%;
  display: block;
  padding: 5px 15px;
  border-radius: 20px;
  transition: background-color 0.2s;
}

.editable-title:hover {
  background-color: rgba(var(--v-theme-on-background), 0.05);
}

.editable-title:focus {
  background-color: rgba(var(--v-theme-on-background), 0.1);
}

.editable-title::placeholder {
  font-style: italic;
  opacity: 0.5;
  color: inherit;
}
</style>
