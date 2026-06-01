<script setup lang="ts">
import type { FullMediaItem, MediaItemAlbumRef } from '@/scripts/types/api/fullPhoto.ts'
import ThumbnailImg from '@/vues/components/ui/ThumbnailImg.vue'
import { useDialogStore } from '@/scripts/stores/dialogStore.ts'
import { useSettingStore } from '@/scripts/stores/settingsStore.ts'
import { computed, defineAsyncComponent, ref, watch } from 'vue'
import { DAYS, MONTHS } from '@/scripts/constants.ts'
import MediaWeatherInfo from '@/vues/components/viewer/MediaWeatherInfo.vue'
import { makeLocationString } from '@/scripts/utils.ts'
import EditDateTimeCard from '@/vues/components/viewer/EditDateTimeCard.vue'
import { useAuthStore } from '@/scripts/stores/authStore.ts'
import type { SharedMediaItem } from '@/scripts/types/api/album.ts'
import { useRoute } from 'vue-router'
import { useTheme } from 'vuetify/framework'

const BaseMap = defineAsyncComponent(() => import('@/vues/components/map/BaseMap.vue'))

const props = defineProps<{
  mediaItem?: FullMediaItem | SharedMediaItem
  albums?: MediaItemAlbumRef[]
}>()

const emit = defineEmits(['closeDateTime', 'openDateTime'])

const theme = useTheme()
const dialogs = useDialogStore()
const settings = useSettingStore()
const authStore = useAuthStore()
const route = useRoute()

const currentAlbumId = computed(() => route.params.albumId as string | undefined)

const showAlbums = computed(
  () => authStore.isAuthenticated && props.albums !== undefined && props.albums.length > 0,
)

const dateTimeDialogOpen = ref(false)

const takenAtDate = computed(() => {
  if (!props.mediaItem?.taken_at_local) return null
  return new Date(props.mediaItem?.taken_at_local)
})

const takenAtDateMyTz = computed(() => {
  if (!props.mediaItem?.taken_at_utc) return null
  return new Date(props.mediaItem?.taken_at_utc)
})

function dateComponents(date: Date) {
  const day = DAYS[date.getDay()]
  const dateString = `${date.getDate()}-${MONTHS[date.getMonth()].substring(0, 3)}-${date.getFullYear().toString().substring(2)}`
  const time = `${date.getHours()}:${date.getMinutes()}`

  return { day, dateString, time }
}

function fullDateString(date: Date) {
  const components = dateComponents(date)
  return `${components.day} • ${components.dateString} • ${components.time}`
}

async function editCaption() {
  const oldCaption = props.mediaItem?.user_caption ?? ''
  const newCaption = await dialogs.prompt({
    title: 'Edit Caption',
    defaultValue: oldCaption,
    confirmText: 'Update',
    attach: true,
  })
  if (!newCaption) return
  // todo update server with new caption and refresh media item
}

watch(dateTimeDialogOpen, () => {
  if (dateTimeDialogOpen.value) {
    dialogs.customVisible = true
    emit('openDateTime')
  } else {
    dialogs.customVisible = false
    emit('closeDateTime')
  }
})
</script>

<template>
  <div
    class="info-panel"
    :class="{ 'backdrop-blur': settings.useBackdropBlur, light: !theme.current.value.dark }"
  >
    <h2 class="info-title">Info</h2>
    <div class="info-loading" v-if="mediaItem === undefined">
      <v-progress-circular indeterminate size="50" />
      <h2>Loading info...</h2>
    </div>
    <template v-else>
      <div class="caption">
        <div class="user-caption">
          <p v-if="mediaItem.user_caption">{{ mediaItem.user_caption }}</p>
          <p class="no-caption" v-else>No caption</p>
          <v-btn
            v-if="authStore.isAuthenticated"
            variant="plain"
            @click="editCaption"
            density="compact"
            rounded
            color="primary"
            class="edit-button"
          >
            Edit
          </v-btn>
        </div>
      </div>
      <v-divider class="mt-2 mb-2" />
      <div class="date-time-weather-filename">
        <div class="date-time-container">
          <p
            v-tooltip="{
              disabled: takenAtDateMyTz === null,
              text: 'In your timezone • ' + fullDateString(takenAtDateMyTz ?? new Date()),
              location: 'bottom',
              attach: true,
            }"
            v-if="takenAtDate"
            class="date-time"
          >
            <span>{{ dateComponents(takenAtDate).day }}</span>
            <span>•</span>
            <span>{{ dateComponents(takenAtDate).dateString }}</span>
            <span>•</span>
            <span>{{ dateComponents(takenAtDate).time }}</span>
          </p>
          <v-dialog max-width="420" persistent v-model="dateTimeDialogOpen">
            <template v-slot:activator="{ props: activatorProps }">
              <v-btn
                variant="plain"
                density="compact"
                rounded
                color="primary"
                class="edit-button"
                v-if="authStore.isAuthenticated"
                v-bind="activatorProps"
              >
                Edit
              </v-btn>
            </template>

            <template v-slot:default="{ isActive }">
              <edit-date-time-card
                v-if="'user_id' in mediaItem"
                :media-item="mediaItem"
                @close-dialog="isActive.value = false"
              />
            </template>
          </v-dialog>
        </div>
        <media-weather-info
          :weather-info="mediaItem?.weather"
          v-if="
            mediaItem?.weather && (mediaItem.weather.temperature || mediaItem.weather.condition)
          "
        />
        <p class="filename">
          <v-icon icon="mdi-cloud-check-outline" class="mr-3" /><span>{{
            mediaItem?.filename.split('.')[0]
          }}</span>
        </p>
      </div>
      <section v-if="showAlbums" class="albums-section">
        <p class="section-label">Albums</p>
        <router-link
          v-for="album in albums"
          :key="album.id"
          :to="`/album/${album.id}`"
          class="album-row"
          :class="{ 'current-album': currentAlbumId === album.id }"
          v-ripple
        >
          <v-avatar size="30" rounded class="album-avatar" color="surface-container-high">
            <thumbnail-img
              v-if="album.thumbnail_id"
              :media-item-id="album.thumbnail_id"
              :height="144"
              cover
            />
            <v-icon v-else icon="mdi-image-album" size="18" class="album-fallback-icon" />
          </v-avatar>
          <span class="album-text">
            <span
              class="album-name"
              v-tooltip:bottom="{ text: album.name, disabled: album.name.length <= 28 }"
            >
              {{ album.name || 'Unnamed' }}
            </span>
            <span class="album-count">
              {{ album.media_count.toLocaleString() }}
              item{{ album.media_count === 1 ? '' : 's' }}
            </span>
          </span>
          <v-icon icon="mdi-chevron-right" size="16" class="album-chevron" />
        </router-link>
      </section>
      <div class="capture-info">
        <!--        todo! capture info-->
      </div>
      <div class="map-info" v-if="mediaItem?.gps">
        <base-map
          class="base-map"
          :map-options="{
            center: { lat: mediaItem.gps.latitude, lon: mediaItem.gps.longitude },
            zoom: 9,
            attributionControl: {
              compact: true,
            },
          }"
        />
        <v-theme-provider theme="dark">
          <v-sheet class="map-buttons">
            <a
              v-ripple
              :href="`https://www.google.com/maps/place/${mediaItem.gps.latitude},${mediaItem.gps.longitude}`"
              target="_blank"
              referrerpolicy="no-referrer"
            >
              <span v-if="mediaItem.gps.location">{{
                makeLocationString(mediaItem.gps.location, 3)
              }}</span>
              <v-icon size="15" class="ml-2 map-button-icon" icon="mdi-arrow-top-right" />
            </a>
          </v-sheet>
        </v-theme-provider>
      </div>
    </template>
  </div>
</template>

<style scoped>
.info-panel {
  margin-top: 5px;
  width: 400px;
  border-radius: 30px;
  font-size: 15px;
  background-color: rgba(var(--v-theme-background), 0.8);
  color: rgb(var(--v-theme-on-background));
  position: relative;
}

.info-panel.light {
  background-color: rgba(var(--v-theme-background), 0.8);
}

.backdrop-blur {
  backdrop-filter: blur(15px) saturate(150%) brightness(90%) contrast(110%);
  background-color: rgba(var(--v-theme-background), 0.6);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.info-title {
  padding-left: 30px;
  padding-top: 10px;
  font-weight: 400;
  font-size: 20px;
  opacity: 0.9;
}

.info-loading {
  width: 100%;
  height: 500px;
  place-items: center;
  place-content: center;
  display: flex;
  flex-direction: column;
}

.info-loading h2 {
  font-size: 20px;
  font-weight: 400;
  opacity: 0.7;
  margin-top: 20px;
}

.caption {
  padding: 5px 30px;
}

.user-caption {
  display: flex;
  align-items: center;
  font-size: 13px;
  justify-content: space-between;
}

.no-caption {
  opacity: 0.7;
}

.edit-button {
  font-size: 14px;
}

.date-time-weather-filename {
  padding: 5px 30px;
}

.date-time-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.date-time {
  display: flex;
  gap: 7px;
  font-size: 14px;
  font-weight: 500;
}

.filename {
  font-size: 14px;
  font-weight: 500;
  opacity: 0.7;
  display: flex;
  align-items: center;
}

.albums-section {
  padding: 4px 22px 8px;
}

.section-label {
  font-size: 11px;
  font-weight: 400;
  letter-spacing: 0.06em;
  margin: 0 8px 6px;
  color: rgb(var(--v-theme-on-surface-variant));
  user-select: none;
}

.album-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 8px;
  margin-bottom: 2px;
  border-radius: 10px;
  text-decoration: none;
  color: inherit;
  transition: background-color 0.15s ease;
}

.album-row.current-album {
  background-color: rgba(var(--v-theme-on-surface), 0.1);
}

.album-row:hover {
  background-color: rgba(var(--v-theme-on-surface), 0.15);
}

.album-row.current-album:hover {
  background-color: rgba(var(--v-theme-on-surface), 0.2);
}

.album-row:active {
  background-color: rgba(var(--v-theme-on-surface), 0.1);
}

.album-avatar {
  flex-shrink: 0;
}

.album-fallback-icon {
  opacity: 0.65;
}

.album-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.album-name {
  font-size: 14px;
  font-weight: 500;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.album-count {
  font-size: 12px;
  opacity: 0.55;
  line-height: 1.2;
}

.album-chevron {
  flex-shrink: 0;
  opacity: 0.35;
}

.map-info {
  border-radius: 20px;
  margin: 10px;
  overflow: hidden;
}

.base-map {
  width: 380px;
  height: 300px;
}

.map-buttons {
  background-color: rgba(var(--v-theme-on-surface), 0.9);
}

.map-buttons a {
  color: rgba(var(--v-theme-surface-variant), 1);
  text-decoration: none;
  display: flex;
  align-items: center;
  user-select: none;
  font-weight: 500;
  font-size: 13px;
  padding: 7px 20px;
}

.map-button-icon {
  font-weight: lighter;
  opacity: 0.8;
}
</style>
