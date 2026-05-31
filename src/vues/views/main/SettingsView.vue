<script setup lang="ts">
import MainLayoutContainer from '@/vues/components/MainLayoutContainer.vue'
import { useSettingStore } from '@/scripts/stores/settingsStore.ts'
import { themeOptions, themeVariantOptions } from '@/scripts/constants.ts'
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

      <v-card flat class="theme-settings" rounded="xl">
        <h2 class="theme-heading">Theme</h2>
        <v-divider class="header-divider" />

        <p class="sub-header-text">Mode</p>

        <div class="sub-settings">
          <div class="theme-chips">
            <v-chip-group
              v-model="settings.themeString"
              color="primary"
              class="chip-group"
              mandatory
            >
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
              color="primary"
            ></v-switch>

            <v-expand-transition>
              <template v-if="!settings.useSunSchedule">
                <div class="time-picker-container">
                  <div class="picker-card">
                    <div class="picker-header">
                      <v-icon color="warning">mdi-white-balance-sunny</v-icon>
                      Turn on light theme
                    </div>
                    <v-time-picker
                      rounded="xl"
                      bg-color="surface-variant"
                      v-model="settings.enableLightThemeTime"
                      format="24hr"
                      scrollable
                    ></v-time-picker>
                  </div>

                  <div class="picker-card">
                    <div class="picker-header">
                      <v-icon color="primary">mdi-weather-night</v-icon>
                      Turn on dark theme
                    </div>
                    <v-time-picker
                      rounded="xl"
                      bg-color="surface-variant"
                      v-model="settings.enableDarkThemeTime"
                      format="24hr"
                      scrollable
                    ></v-time-picker>
                  </div>
                </div>
              </template>
            </v-expand-transition>
          </div>
        </div>

        <p class="sub-header-text">Color</p>

        <div class="sub-settings">
          <v-switch
            color="primary"
            v-model="settings.imageBackground"
            label="Use random image background"
            hide-details
          ></v-switch>
          <template v-if="!settings.imageBackground">
            <p>Pick a theme color</p>
            <v-color-picker bg-color="surface-variant" v-model="settings.customThemeColor" />

            <v-chip-group v-model="settings.customThemeVariant" color="primary" mandatory>
              <v-chip v-for="opt in themeVariantOptions" :value="opt" class="theme-chip" :key="opt">
                {{ caps(opt) }}
              </v-chip>
            </v-chip-group>
          </template>
        </div>
      </v-card>

      <v-divider class="divider-spacing" />

      <h3>Other settings placeholder</h3>
    </div>
  </main-layout-container>
</template>

<style scoped>
.main-container {
  padding: 20px 40px;
}

.theme-settings {
  margin-top: 25px;
  padding: 10px 30px;
  border: 1px solid rgba(var(--v-theme-on-primary), 0.3);
  background-color: rgba(var(--v-theme-on-primary), 0.03);
}

.divider-spacing {
  margin-top: 20px;
  margin-bottom: 20px;
}

.theme-heading {
  background-color: rgba(var(--v-theme-on-primary), 0.1);
  padding: 30px;
  margin-left: -30px;
  margin-right: -30px;
  margin-top: -10px;
  margin-bottom: 0;
}

.header-divider {
  margin-left: -30px;
  margin-right: -30px;
  margin-bottom: 20px;
}

.sub-header-text {
  text-align: center;
  font-weight: 400;
  font-size: 13px;
  color: rgba(var(--v-theme-on-surface-variant), 1);
  text-transform: uppercase;
  border: 1px solid rgba(var(--v-theme-on-primary), 0.4);
  background-color: rgba(var(--v-theme-on-primary), 0.2);
  border-radius: 10px;
  padding: 5px;
  margin: 10px 0px;
}

.sub-settings {
  padding: 10px 25px;
}

.schedule-heading {
  margin-top: 12px;
  margin-bottom: 0;
  font-weight: 400;
  font-size: 15px;
  opacity: 0.7;
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
  opacity: 0.8;
  font-size: 1rem;
  font-weight: bold;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>
