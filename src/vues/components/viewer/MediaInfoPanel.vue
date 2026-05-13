<script setup lang="ts">
import BaseMap from '@/vues/components/map/BaseMap.vue'
import type { FullMediaItem } from '@/scripts/types/api/fullPhoto.ts'
import { useDialogStore } from '@/scripts/stores/dialogStore.ts'

const props = defineProps<{
  mediaItem?: FullMediaItem
}>()

const dialogs = useDialogStore()

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
</script>

<template>
  <div class="info-panel">
    <h2 class="info-title">Info</h2>
    <div class="info-loading" v-if="mediaItem === undefined">
      <v-progress-circular indeterminate size="50" />
      <h2>Loading info...</h2>
    </div>
    <template v-else>
      <div class="caption">
        <h3 class="caption-title">Caption</h3>
        <div class="user-caption">
          <p v-if="mediaItem.user_caption">{{ mediaItem.user_caption }}</p>
          <p class="no-caption" v-else>No caption</p>
          <v-btn variant="plain" @click="editCaption" density="compact" rounded color="primary">
            Edit
          </v-btn>
        </div>
      </div>
      <base-map
        class="base-map"
        v-if="mediaItem?.gps"
        height="300px"
        width="380px"
        :center="{ lat: mediaItem.gps.latitude, lon: mediaItem.gps.longitude }"
        :zoom="9"
      />
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
  margin-top:5px;
  width: 400px;
  height: 700px;
  border-radius: 30px;
  font-size: 15px;
  backdrop-filter: blur(30px) saturate(150%) brightness(90%) contrast(90%);
  background-color: rgba(20, 20, 20, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.info-title {
  padding-left: 30px;
  padding-top: 10px;
  font-weight: 400;
  font-size: 20px;
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

.caption-title {
  font-size: 15px;
  margin: 0;
  opacity: 0.9;
}

.user-caption {
  display: flex;
  align-items: center;
  font-size: 13px;
}

.no-caption {
  opacity: 0.7;
}

.base-map {
  box-shadow: 0 0 40px 0 rgba(255, 255, 255, 0.2);
  border-radius: 30px;
  margin: 10px;
}
</style>
