<script setup lang="ts">
import MainLayoutContainer from '@/vues/components/MainLayoutContainer.vue'
import { useSettingStore } from '@/scripts/stores/settingsStore.ts'
import { themeOptions } from '@/scripts/constants.ts'
import { caps } from '@/scripts/utils.ts'
import { useSunStore } from '@/scripts/stores/sunStore.ts'
import { computed, onMounted } from 'vue'

const settings = useSettingStore()
const sun = useSunStore()

onMounted(() => {
  sun.fetchSunTimes(true)
})

const sunString = computed(() => {
  if (!sun.sunset || !sun.sunrise) {
    return ''
  }
  return ` ${sun.sunrise.toLocaleTimeString()} ${sun.sunset.toLocaleTimeString()}`
})
</script>

<template>
  <main-layout-container class="settings">
    <div class="main-container">
      <h1>Settings</h1>
      <v-divider class="mt-5 mb-5"></v-divider>
      <h3 class="mb-3">Theme</h3>
      <div class="theme-chips">
        <!--        todo: Change to light theme when user clicks light theme (persist it), same for dark theme, for 'system' make theme follow system theme. Make sure to watch for system theme change.
        For schedule, let user pick a start time for light time and a start time for dark theme, or let them pick have it follow sunset/sunrise times. Make sure to auto change when sun sets.
         For context: sun calculations in sunStore.ts
         settings in settingsStore.ts
         -->
        <v-chip-group v-model="settings.themeString" color="primary" class="chip-group" mandatory>
          <v-chip v-for="opt in themeOptions" :value="opt" class="theme-chip" :key="opt">
            {{ caps(opt) }}
          </v-chip>
        </v-chip-group>
      </div>
      <div v-if="settings.themeString === 'schedule'">
        <h4 class="mt-3">Schedule theme</h4>
        <v-switch
          v-model="settings.useSunSchedule"
          :label="`Sunrise to sunset${sunString}`"
          hide-details
        ></v-switch>
        <template v-if="!settings.useSunSchedule">
          <label class="mr-3" for="light-picker">Turn on light theme</label>
          <!--          change to vuetify time picker-->
          <input
            id="light-picker"
            v-model="settings.enableLightThemeTime"
            max="24:00"
            min="00:00"
            required
            type="time"
          />
          <div class="mt-3 mb-3" />
          <label class="mr-3" for="dark-picker">Turn on dark theme</label>
          <!--          change to vuetify time picker-->
          <input
            id="dark-picker"
            v-model="settings.enableDarkThemeTime"
            max="24:00"
            min="00:00"
            required
            type="time"
          />
        </template>
      </div>
      <v-divider class="mt-5 mb-5" />
      <h3>Other settings placeholder</h3>
    </div>
  </main-layout-container>
</template>

<style scoped>
.main-container {
  padding: 20px 40px;
}
</style>
