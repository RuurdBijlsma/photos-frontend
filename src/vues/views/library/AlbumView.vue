<script setup lang="ts">
import { useRoute, useRouter, onBeforeRouteLeave, onBeforeRouteUpdate } from 'vue-router'
import { computed, nextTick, ref, useTemplateRef, watch } from 'vue'
import { useAlbumStore } from '@/scripts/stores/albumStore.ts'
import { useSnackbarsStore } from '@/scripts/stores/snackbarStore.ts'
import { useDialogStore } from '@/scripts/stores/dialogStore.ts'
import { useDebounceFn, useTextareaAutosize } from '@vueuse/core'
import EditableTitle from '@/vues/components/ui/EditableTitle.vue'
import { CURRENT_YEAR, MONTHS } from '@/scripts/constants.ts'
import { stringToColor } from '@/scripts/utils.ts'
import albumService from '@/scripts/services/albumService.ts'
// eslint-disable-next-line
import SimpleTimeline from '@/vues/components/timeline/simple-timeline/SimpleTimeline.vue'
import GlowThumbnail from '@/vues/components/ui/GlowThumbnail.vue'

const route = useRoute()
const router = useRouter()
const albumStore = useAlbumStore()
const simpleTimeline = useTemplateRef('simpleTimeline')
const snackbars = useSnackbarsStore()
const dialogs = useDialogStore()

const isManualOrderMode = ref(false)
const manualOrderList = ref<string[]>([])

const id = computed(() => {
  const rawId = route.params.albumId
  if (rawId && !Array.isArray(rawId)) return rawId
  console.warn('WEIRD ALBUM ID IN ROUTE DETECTED')
  return null
})
const albumResponse = computed(() => {
  if (!id.value) return null
  const response = albumStore.albumMedia.get(id.value) ?? null
  console.log('AlbumResponse', response)
  return response
})
const minimalAlbumInfo = computed(() => albumStore.userAlbums.find((a) => a.id === id.value))
const album = computed(() => albumResponse.value?.album ?? null)
const items = computed(() => albumResponse.value?.items ?? [])
const updateAlbumTitleDb = useDebounceFn(updateAlbumTitle, 500)
const updateAlbumDescriptionDb = useDebounceFn(updateAlbumDescription, 500)
const albumTitle = ref<string | null>(null)
const albumDescription = ref<string | null>('')
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
  if (startDay === endDay) return `${MONTHS[startMonthIdx]} ${startDay}${yearSuffix}`
  return `${getShortMonth(startMonthIdx)} ${startDay} – ${endDay}${yearSuffix}`
})
const textAreaDescription = computed(() => albumDescription.value ?? '')
const { textarea, triggerResize } = useTextareaAutosize({ input: textAreaDescription })
const descTextAreaFocus = ref(false)

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

function updateAlbumDescription(albumId: string, description: string) {
  if (id.value && albumId === id.value && album.value && album.value.description !== description) {
    console.log(album.value.description, description)
    album.value.description = description
    triggerResize()
    albumStore.updateAlbumDetails(id.value, { description })
  }
}

function setDescription() {
  albumDescription.value = ''
  nextTick(() => {
    textarea.value?.focus()
  })
}

function focusTextArea() {
  descTextAreaFocus.value = true
}

function blurTextArea() {
  descTextAreaFocus.value = false
}

function removeDescription() {
  if (!id.value) return
  albumService.removeAlbumDescription(id.value).then(() => {
    requestIdleCallback(() => albumStore.fetchUserAlbums())
  })
  albumDescription.value = null
}

async function deleteAlbum() {
  const id = album.value?.id
  if (!id) return
  const deleted = await albumStore.deleteAlbum(id)
  if (deleted) await router.push({ name: 'albums' })
}

function manualOrderMode() {
  isManualOrderMode.value = true
  snackbars.enqueue({
    message: 'Drag photos to reorder the album',
    icon: 'mdi-pencil-outline',
    timeout: 5000,
  })
}

function cancelReorder() {
  isManualOrderMode.value = false
  manualOrderList.value = []
  // SimpleTimeline will reset its localItemsOrder because it watches props.timelineItems
}

async function saveReorder() {
  if (!id.value || manualOrderList.value.length === 0) {
    isManualOrderMode.value = false
    return
  }
  await albumStore.reorderMedia(id.value, manualOrderList.value)
  isManualOrderMode.value = false
}

function onReorder(items: any[]) {
  manualOrderList.value = items.map((i) => i.id)
}

async function sortAlbumByDate() {
  if (!id.value) return
  await albumService.sortAlbumByDate(id.value)
  albumStore.fetchAlbumMedia(id.value, false)
}

async function confirmRouteLeave(next) {
  if (isManualOrderMode.value) {
    const confirmed = await dialogs.confirm({
      title: 'Leave reorder mode?',
      description: 'You have unsaved changes. Are you sure you want to leave?',
      confirmText: 'Leave',
      color: 'warning',
    })
    if (confirmed) {
      isManualOrderMode.value = false
      next()
    } else {
      next(false)
    }
  } else {
    next()
  }
}

onBeforeRouteLeave(async (to, from, next) => confirmRouteLeave(next))
onBeforeRouteUpdate(async (to, from, next) => confirmRouteLeave(next))

watch(
  id,
  () => {
    isManualOrderMode.value = false
    albumTitle.value = null
    albumDescription.value = null
    console.log('Album ID change', id.value)
    simpleTimeline.value?.scrollToTop()
    if (!id.value) return
    albumStore.fetchAlbumMedia(id.value)
  },
  { immediate: true },
)

watch(
  minimalAlbumInfo,
  () => {
    // Do on nextTick, otherwise albumTitle may still be set from previous album page
    // it's unset in the `id` watcher
    nextTick(() => {
      if (!id.value) return
      if (!minimalAlbumInfo.value) return
      if (albumTitle.value === null) albumTitle.value = minimalAlbumInfo.value.name
      if (albumDescription.value === null)
        albumDescription.value = minimalAlbumInfo.value.description
    })
  },
  { immediate: true },
)

watch(albumDescription, (newVal, oldVal) => {
  if (newVal !== oldVal && id.value && newVal !== null) {
    triggerResize()
    updateAlbumDescriptionDb(id.value, newVal ?? '')
  }
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
  <div class="album-container">
    <div class="album-reorder-header" v-if="isManualOrderMode">
      <v-btn
        variant="tonal"
        rounded
        color="primary"
        class="mr-3"
        prepend-icon="mdi-sort-calendar-ascending"
        @click="sortAlbumByDate"
      >
        Sort by date
      </v-btn>
      <v-spacer />
      <v-btn variant="text" rounded class="mr-2" @click="cancelReorder">Cancel</v-btn>
      <v-btn
        variant="elevated"
        color="primary"
        rounded
        @click="saveReorder"
        prepend-icon="mdi-check"
      >
        Done
      </v-btn>
    </div>
    <simple-timeline
      ref="simpleTimeline"
      :timeline-items="items"
      :view-link="`/album/${id}/view/`"
      v-if="id"
      :context="{ album: id }"
      :is-manual-order-mode="isManualOrderMode"
      @reorder="onReorder"
    >
      <div class="album-header">
        <div class="album-header-left">
          <glow-thumbnail
            v-if="thumbnailId"
            :media-item-id="thumbnailId"
            border-radius="44px"
            :height="222"
            :max-width="(222 * 16) / 9"
          />
        </div>
        <div class="album-header-right">
          <div class="album-header-first-row">
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
            <v-menu location="bottom end" v-if="!isManualOrderMode">
              <template v-slot:activator="{ props }">
                <v-btn
                  v-bind="props"
                  class="album-options-btn"
                  icon="mdi-dots-horizontal"
                  variant="tonal"
                  density="comfortable"
                  color="primary"
                  @click.stop.prevent
                />
              </template>
              <v-list density="compact" bg-color="surface-container-high">
                <v-list-item @click="deleteAlbum" prepend-icon="mdi-delete">
                  <v-list-item-title>Delete album</v-list-item-title>
                </v-list-item>
                <v-list-item @click="manualOrderMode" prepend-icon="mdi-pencil-outline">
                  <v-list-item-title>Edit order</v-list-item-title>
                </v-list-item>
              </v-list>
            </v-menu>
          </div>
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
              v-if="albumDescription === null"
              class="description-add-button"
              prepend-icon="mdi-plus"
              density="compact"
              variant="plain"
              rounded
              @click="setDescription"
            >
              Add description
            </v-btn>
            <div v-else class="description-with-remove">
              <textarea
                class="album-description"
                ref="textarea"
                :style="{
                  boxShadow:
                    albumDescription?.length > 0
                      ? ''
                      : `inset 0 0 0 1px rgba(var(--v-theme-on-background), 0.3)`,
                }"
                v-model="albumDescription"
                @input="triggerResize"
                @focus="focusTextArea"
                @blur="blurTextArea"
              ></textarea>
              <v-btn
                @click="removeDescription"
                v-tooltip:top="'Remove description'"
                icon="mdi-close"
                density="compact"
                variant="plain"
                :style="{
                  opacity: descTextAreaFocus ? 'inherit' : 0,
                }"
              ></v-btn>
            </div>
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
              variant="tonal"
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
          <v-btn v-if="!isManualOrderMode" @click="sortAlbumByDate">Sort chronologically</v-btn>
        </div>
      </div>
    </simple-timeline>
  </div>
</template>

<style scoped>
.album-container {
  display: flex;
  flex-direction: column;
  width: 100%;
}

.album-reorder-header {
  display: flex;
  padding: 10px 50px 10px 10px;
}

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

.album-header-first-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.album-options-btn {
  margin: 4px;
}

.editable-header {
  margin-left: -19px;
  width: calc(100% + 19px);
}

.album-dates {
  font-weight: 400;
  font-size: 15px;
  opacity: 0.7;
  margin: 0;
  margin-top: 3px;
}

.description-add-button {
  margin-left: -15px;
  font-style: italic;
  text-transform: capitalize;
  font-weight: 400;
  opacity: 0.5;
  margin-top: 8px;
  margin-bottom: 5px;
}

.description-with-remove {
  display: flex;
  align-items: center;
  gap: 10px;
}

.album-description {
  font-weight: 400;
  font-size: 14px;
  opacity: 0.8;
  margin-top: 3px;
  resize: none;
  border-radius: 10px;
  padding: 5px;
  margin-left: -5px;
  width: calc(100% + 5px);
  font-family: Roboto, sans-serif;
  margin-bottom: 3px;
  position: relative;
  background-color: transparent;
  border: 0 solid transparent;
}

.album-description:focus {
  outline: 1px solid rgb(var(--v-theme-primary));
}

.album-collaborators {
  margin-top: 5px;
  display: flex;
  gap: 10px;
}

.collaborator-avatar {
  font-weight: 600;
}
</style>
