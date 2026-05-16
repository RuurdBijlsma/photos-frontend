<script setup lang="ts">
import BaseMap from '@/vues/components/map/BaseMap.vue'
import type { FullMediaItem } from '@/scripts/types/api/fullPhoto.ts'
import { useDialogStore } from '@/scripts/stores/dialogStore.ts'
import { useSettingStore } from '@/scripts/stores/settingsStore.ts'
import { computed, ref, watch } from 'vue'
import { DAYS, MONTHS } from '@/scripts/constants.ts'
import MediaWeatherInfo from '@/vues/components/viewer/MediaWeatherInfo.vue'
import { makeLocationString } from '@/scripts/utils.ts'
import EditDateTimeCard from '@/vues/components/viewer/EditDateTimeCard.vue'
import { useAuthStore } from '@/scripts/stores/authStore.ts'
import type { SharedMediaItem } from '@/scripts/types/api/album.ts'

const props = defineProps<{
  mediaItem?: FullMediaItem | SharedMediaItem
}>()

const emit = defineEmits(['closeDateTime', 'openDateTime'])

const dialogs = useDialogStore()
const settings = useSettingStore()
const authStore = useAuthStore()

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
  <div class="info-panel" :class="{ 'backdrop-blur': settings.useBackdropBlur }">
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
      <div class="capture-info"></div>
      <div class="map-info" v-if="mediaItem?.gps">
        <base-map
          class="base-map"
          height="300px"
          width="380px"
          :center="{ lat: mediaItem.gps.latitude, lon: mediaItem.gps.longitude }"
          :zoom="9"
        />
        <a
          class="map-buttons"
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
      </div>
    </template>

    <!--
UI ELEMENTS TO PUT HERE (see fullPhoto.ts for available fields):
Caption - text input -> edit button that opens dialogs.prompt
<v-divider/>
Date: Sunday - Aug 12, 2018 - 17:29 -> edit button that opens custom dialog to adjust photo's datetime
Weather (fields are nullable, often individually unavilable)
* temperature
* weather condition, shown with nice icon.
* On click, show custom dialog with more info -> temp, dew point, relative humidity, precisipitation, snow, wind direction, speed, wind gust, pressure.
context: temp is celcius, dew point is celcius, humidity is %, precipitation is mm per hour, snow is millimeters, wind is degrees, wind speed/gust is km/h, pressure is sea-level air pressure in hPa, weather condition is a condition code:
 for weather icons, use utils.ts getWeatherIcon(condition: string, isDaytime: boolean)

Filename: Photo's filename

<little card within the card>
  * camera name - filetype
  * resolution in MP - resolution in width x height * file size
  * iso, lens adjusted zoom, exposure compensation, f-stop, shutter time
  * if video -> fps
</>little card within the card>

map card showing where the photo is taken (see BaseMap.vue)
location name (see location string computed prop on this component) (clickable, opens google maps at coordinate)

--- style
copy general style from search filters v-menu. See SearchView.vue.
-->
  </div>
</template>

<style scoped>
.info-panel {
  margin-top: 5px;
  width: 400px;
  border-radius: 30px;
  font-size: 15px;
  background-color: rgba(var(--v-theme-background), 0.5);
  color: rgb(var(--v-theme-on-background));
  position: relative;
}

.backdrop-blur {
  backdrop-filter: blur(15px) saturate(150%) brightness(90%) contrast(110%);
  background-color: rgba(var(--v-theme-background), 0.5);
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

.map-info {
  border-radius: 20px;
  margin: 10px;
  overflow: hidden;
}

.base-map {
}

.map-buttons {
  background-color: rgba(var(--v-theme-on-surface), 0.9);
  color: rgba(var(--v-theme-surface-variant), 1);
  padding: 7px 20px;
  user-select: none;
  font-weight: 500;
  font-size: 13px;
  display: flex;
  align-items: center;
  text-decoration: none;
}

.map-button-icon {
  font-weight: lighter;
  opacity: 0.8;
}
</style>
