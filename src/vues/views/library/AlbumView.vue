<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { computed, nextTick, ref, watch } from 'vue'
import { useAlbumStore } from '@/scripts/stores/albumStore.ts'
import mediaItemService from '@/scripts/services/mediaItemService.ts'
import GlowImage from '@/vues/components/ui/GlowImage.vue'
import { useDebounceFn, useTextareaAutosize } from '@vueuse/core'
import EditableTitle from '@/vues/components/ui/EditableTitle.vue'
import SimpleTimeline from '@/vues/components/simple-timeline/SimpleTimeline.vue'
import { CURRENT_YEAR, MONTHS } from '@/scripts/constants.ts'
import { stringToColor } from '@/scripts/utils.ts'

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
const updateAlbumDescriptionDb = useDebounceFn(updateAlbumDescription, 500)
const albumTitle = ref<string | null>(null)
const description = computed({
  get: () => {
    if (album.value !== null) return album.value?.description ?? null
    return minimalAlbumInfo.value?.description ?? null
  },
  set: (val) => {
    triggerResize()
    if (val !== null) updateAlbumDescriptionDb(val)
  },
})
const thumbnailId = computed(() => {
  if (album.value !== null) return album.value?.thumbnailId ?? null
  return minimalAlbumInfo.value?.thumbnailId ?? null
})
const formattedDates = computed(() => {
  const firstDate = album.value?.firstDate ?? null
  const lastDate = album.value?.lastDate ?? null
  if (firstDate === null || lastDate === null) return null
  const start = new Date(firstDate)
  const end = new Date(lastDate)

  const startYear = start.getFullYear()
  const endYear = end.getFullYear()
  const startMonthIdx = start.getMonth()
  const endMonthIdx = end.getMonth()
  const startDay = start.getDate()
  const endDay = end.getDate()
  const getShortMonth = (idx: number) => MONTHS[idx]?.slice(0, 3)
  if (startYear !== endYear)
    return `${getShortMonth(startMonthIdx)} ${startDay}, ${startYear} – ${getShortMonth(endMonthIdx)} ${endDay}, ${endYear}`
  const yearSuffix = startYear === CURRENT_YEAR ? '' : `, ${startYear}`
  if (startMonthIdx !== endMonthIdx)
    return `${getShortMonth(startMonthIdx)} ${startDay} – ${getShortMonth(endMonthIdx)} ${endDay}${yearSuffix}`
  if (startDay === endDay) return `${getShortMonth(startMonthIdx)} ${startDay}${yearSuffix}`
  return `${getShortMonth(startMonthIdx)} ${startDay} – ${endDay}${yearSuffix}`
})
const textAreaDescription = computed(() => description.value ?? '')
const { textarea, triggerResize } = useTextareaAutosize({ input: textAreaDescription })

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

function updateAlbumDescription(description: string) {
  if (id.value && album.value?.description) {
    album.value.description = description
    triggerResize()
    albumStore.updateAlbumDetails(id.value, { description: description })
  }
}

watch(
  id,
  () => {
    albumTitle.value = null
    console.log('Album ID change', id.value)
    const idToLoad = id.value
    if (!idToLoad) return
    albumStore.fetchAlbumMedia(idToLoad).then(() => {
      if (id.value !== idToLoad) return
      console.log('Album info', albumStore.albumMedia.get(idToLoad))
      albumTitle.value = album.value?.name ?? ''
    })
  },
  { immediate: true },
)

watch(minimalAlbumInfo, () => {
  // Do on nextTick, otherwise albumTitle may still be set from previous album page
  // it's unset in the `id` watcher
  nextTick(() => {
    if (!id.value) return
    if (!minimalAlbumInfo.value) return
    if (albumTitle.value !== null) return
    albumTitle.value = minimalAlbumInfo.value.name
  })
}, {immediate: true })

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
  <simple-timeline :timeline-items="items" :view-link="`/album/${id}/view/`">
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
          class="editable-header"
          v-if="albumTitle !== null"
          name="album title"
          :autofocus="route.query?.create === '1'"
          v-model="albumTitle"
        />
        <v-skeleton-loader
          v-else
          type="heading"
          width="50%"
          height="17%"
          :style="{ transform: `translateX(-18px)` }"
        />
        <p v-if="formattedDates" class="album-dates">{{ formattedDates }}</p>
        <v-skeleton-loader
          v-else
          height="13%"
          type="text"
          width="30%"
          :style="{ transform: `translateX(-18px)` }"
        />
        <div class="description-area" v-if="album">
          <v-btn
            v-if="!description"
            class="description-add-button"
            prepend-icon="mdi-plus"
            density="compact"
            variant="plain"
            rounded
            @click="console.error('todo')"
          >
            Add description
          </v-btn>
          <textarea
            v-else
            class="album-description"
            ref="textarea"
            v-model="description"
            @input="triggerResize"
          ></textarea>
        </div>
        <v-skeleton-loader
          v-else
          type="subtitle"
          height="13%"
          width="37%"
          :style="{ transform: `translateX(-18px)` }"
        />
        <div class="album-collaborators" v-if="album">
          <div
            class="album-collaborator"
            v-for="collaborator in album.collaborators"
            :key="collaborator.id"
          >
            <v-avatar
              :color="stringToColor(collaborator.name)"
              class="collaborator-avatar"
              v-tooltip:top="
                `${collaborator.name}${collaborator.userId === album.ownerId ? ' (Owner)' : ''}`
              "
            >
              {{
                collaborator.name
                  .split(' ')
                  .map((i) => i[0]!.toUpperCase())
                  .join('')
              }}
            </v-avatar>
          </div>
          <v-btn
            v-tooltip:top="'Add collaborator'"
            icon="mdi-plus"
            variant="outlined"
            color="primary"
            size="40"
          ></v-btn>
        </div>
        <v-skeleton-loader
          v-else
          height="10%"
          type="avatar,avatar"
          :style="{ transform: `translateX(-60px) scale(0.88)` }"
        />
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

.editable-header {
  margin-left: -19px;
  width: calc(100% + 19px);
}

.album-dates {
  font-weight: 400;
  font-size: 15px;
  opacity: 0.7;
  margin-top: 3px;
}

.description-add-button {
  margin-left: -15px;
  font-style: italic;
  text-transform: capitalize;
  font-weight: 400;
  opacity: 0.5;
  margin-top: 10px;
  margin-bottom: 5px;
}

.album-description {
  font-weight: 500;
  font-size: 15px;
  opacity: 0.9;
  margin-top: 12px;
  resize: none;
  border-radius: 10px;
  padding: 5px;
  margin-left: -5px;
  width: calc(100% + 5px);
}

.album-description:focus {
  outline: 1px solid rgb(var(--v-theme-primary));
}

.album-collaborators {
  margin-top: 10px;
  display: flex;
  gap: 10px;
}

.collaborator-avatar {
  font-weight: 600;
}
</style>
