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
  return ` (${sun.sunrise.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })} - ${sun.sunset.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })})`
})
</script>

<template>
  <main-layout-container class="settings">
    <div class="main-container">
      <h1>Settings</h1>

      <v-divider class="divider-spacing"></v-divider>

      <h3 class="theme-heading">Theme</h3>

      <div class="theme-chips">
        <v-chip-group v-model="settings.themeString" color="primary" class="chip-group" mandatory>
          <v-chip v-for="opt in themeOptions" :value="opt" class="theme-chip" :key="opt">
            {{ caps(opt) }}
          </v-chip>
        </v-chip-group>
      </div>

      <div v-if="settings.themeString === 'schedule'">
        <h4 class="schedule-heading">Schedule theme</h4>
        <v-switch
          v-model="settings.useSunSchedule"
          :label="`Sunrise to sunset${sunString}`"
          hide-details
        ></v-switch>

        <template v-if="!settings.useSunSchedule">
          <div class="time-picker-container">
            <v-card class="picker-card">
              <div class="picker-header">
                <v-icon color="warning">mdi-white-balance-sunny</v-icon>
                Turn on light theme
              </div>
              <v-time-picker
                bg-color="surface-variant"
                v-model="settings.enableLightThemeTime"
                format="24hr"
                scrollable
              ></v-time-picker>
            </v-card>

            <v-card class="picker-card">
              <div class="picker-header">
                <v-icon color="primary">mdi-weather-night</v-icon>
                Turn on dark theme
              </div>
              <v-time-picker
                bg-color="surface-variant"
                v-model="settings.enableDarkThemeTime"
                format="24hr"
                scrollable
              ></v-time-picker>
            </v-card>
          </div>
        </template>
      </div>

      <v-divider class="divider-spacing" />

      <h3>Other settings placeholder</h3>
    </div>
  </main-layout-container>
</template>

<style scoped>
.main-container {
  padding: 20px 40px;
}

.divider-spacing {
  margin-top: 20px;
  margin-bottom: 20px;
}

.theme-heading {
  margin-bottom: 12px;
}

.schedule-heading {
  margin-top: 12px;
}

.time-picker-container {
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
  margin-top: 24px;
  justify-content: flex-start;
  align-items: stretch;
}

.picker-card {
  padding: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.picker-header {
  font-size: 1rem;
  font-weight: bold;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>
