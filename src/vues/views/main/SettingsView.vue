<script setup lang="ts">
import MainLayoutContainer from '@/vues/components/MainLayoutContainer.vue'
import { useSettingStore } from '@/scripts/stores/settingsStore.ts'
import { themeOptions, themeVariantOptions } from '@/scripts/constants.ts'
import { caps } from '@/scripts/utils.ts'
import { useSunStore } from '@/scripts/stores/sunStore.ts'
import { computed } from 'vue'
import { useBackgroundStore } from '@/scripts/stores/backgroundStore.ts'

const settings = useSettingStore()
const sun = useSunStore()
const backgroundStore = useBackgroundStore()

const sunString = computed(() => {
  if (!sun.sunset || !sun.sunrise) {
    return ''
  }
  return ` (${sun.sunrise.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })} - ${sun.sunset.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })})`
})

// Swatches to visualize semantic theme colors mapped to current theme formulas
const previewSwatches = [
  { name: 'Primary', bg: 'bg-primary', text: 'text-on-primary', desc: 'Main accent' },
  {
    name: 'Primary Container',
    bg: 'bg-primary-container',
    text: 'text-on-primary-container',
    desc: 'Primary container',
  },
  {
    name: 'Secondary',
    bg: 'bg-secondary',
    text: 'text-on-secondary',
    desc: 'Less prominent accent',
  },
  {
    name: 'Secondary Container',
    bg: 'bg-secondary-container',
    text: 'text-on-secondary-container',
    desc: 'Secondary container',
  },
  { name: 'Tertiary', bg: 'bg-tertiary', text: 'text-on-tertiary', desc: 'Contrasting accent' },
  {
    name: 'Tertiary Container',
    bg: 'bg-tertiary-container',
    text: 'text-on-tertiary-container',
    desc: 'Tertiary container',
  },
  {
    name: 'Surface Low',
    bg: 'bg-surface-container-low',
    text: 'text-on-surface',
    desc: 'Lowest emphasis card background',
  },
  {
    name: 'Surface High',
    bg: 'bg-surface-container-high',
    text: 'text-on-surface',
    desc: 'Highest emphasis card background',
  },
]
</script>

<template>
  <main-layout-container class="settings">
    <div class="settings-content py-8 px-6 max-width-container">
      <h1 class="text-h4 font-weight-bold mb-6 text-on-surface">Settings</h1>

      <v-row class="g-6">
        <!-- Settings Configuration Panel -->
        <v-col cols="12" lg="7">
          <v-card class="bg-surface-container-low" flat rounded="xl" border>
            <!-- Card Header -->
            <div
              class="bg-surface-container-high px-6 py-4 rounded-t-xl d-flex align-center justify-space-between border-b"
            >
              <span class="text-h6 font-weight-medium text-on-surface">Theme Configuration</span>
              <v-icon color="primary" size="large">mdi-palette-outline</v-icon>
            </div>

            <div class="pa-6">
              <!-- Section: Mode Settings -->
              <div class="d-flex align-center mb-4">
                <span class="text-overline font-weight-bold text-primary tracking-wide">Mode</span>
                <v-divider class="ms-4 opacity-30" />
              </div>

              <div class="mb-6">
                <v-chip-group v-model="settings.themeString" color="primary" mandatory>
                  <v-chip
                    v-for="opt in themeOptions"
                    :value="opt"
                    :key="opt"
                    variant="flat"
                    class="px-5 py-4"
                  >
                    {{ caps(opt) }}
                  </v-chip>
                </v-chip-group>
              </div>

              <!-- Subsection: Schedule Options -->
              <v-expand-transition>
                <div
                  v-if="settings.themeString === 'schedule'"
                  class="mb-6 bg-surface-container-highest pa-5 rounded-lg border"
                >
                  <span class="text-subtitle-2 font-weight-medium text-on-surface mb-2 d-block"
                    >Schedule Theme Settings</span
                  >
                  <v-switch
                    v-model="settings.useSunSchedule"
                    :label="`Sunrise to sunset${sunString}`"
                    hide-details
                    color="primary"
                    inset
                    density="comfortable"
                    class="mb-4"
                  />

                  <v-expand-transition>
                    <div v-if="!settings.useSunSchedule" class="time-picker-grid mt-4">
                      <v-card class="bg-surface-container-high border" rounded="xl" flat>
                        <div class="px-4 py-3 d-flex align-center gap-2 border-b">
                          <v-icon color="warning">mdi-white-balance-sunny</v-icon>
                          <span class="text-caption font-weight-bold">Turn on light theme</span>
                        </div>
                        <div class="pa-3 d-flex justify-center">
                          <v-time-picker
                            rounded="lg"
                            bg-color="surface-container"
                            v-model="settings.enableLightThemeTime"
                            format="24hr"
                            scrollable
                            elevation="0"
                          />
                        </div>
                      </v-card>

                      <v-card class="bg-surface-container-high border" rounded="xl" flat>
                        <div class="px-4 py-3 d-flex align-center gap-2 border-b">
                          <v-icon color="primary">mdi-weather-night</v-icon>
                          <span class="text-caption font-weight-bold">Turn on dark theme</span>
                        </div>
                        <div class="pa-3 d-flex justify-center">
                          <v-time-picker
                            rounded="lg"
                            bg-color="surface-container"
                            v-model="settings.enableDarkThemeTime"
                            format="24hr"
                            scrollable
                            elevation="0"
                          />
                        </div>
                      </v-card>
                    </div>
                  </v-expand-transition>
                </div>
              </v-expand-transition>

              <!-- Section: Color Settings -->
              <div class="d-flex align-center mb-4 mt-6">
                <span class="text-overline font-weight-bold text-primary tracking-wide">Color</span>
                <v-divider class="ms-4 opacity-30" />
              </div>

              <div class="mb-6">
                <v-switch
                  color="primary"
                  v-model="settings.imageBackground"
                  label="Use random image background"
                  hide-details
                  inset
                  density="comfortable"
                  class="mb-4"
                />

                <v-btn
                  v-if="settings.imageBackground"
                  rounded
                  variant="flat"
                  prepend-icon="mdi-shuffle-variant"
                  @click="backgroundStore.newBackgroundTheme"
                  color="secondary"
                  >New background</v-btn
                >
                <v-slide-y-transition>
                  <div v-if="!settings.imageBackground" class="mb-6">
                    <span class="text-subtitle-2 font-weight-medium text-on-surface mb-3 d-block"
                      >Pick a Theme Seed Color</span
                    >
                    <v-card
                      class="bg-surface-container-high d-inline-block border pa-2"
                      rounded="xl"
                      flat
                    >
                      <v-color-picker
                        bg-color="transparent"
                        v-model="settings.customThemeColor"
                        hide-inputs
                        flat
                      />
                    </v-card>
                  </div>
                </v-slide-y-transition>
              </div>

              <!-- Section: Variant Options -->
              <div class="mb-4">
                <span class="text-subtitle-2 font-weight-medium text-on-surface mb-2 d-block"
                  >Pick a Theme Variant</span
                >
                <v-chip-group
                  v-model="settings.customThemeVariant"
                  color="primary"
                  mandatory
                  column
                >
                  <v-chip
                    v-for="opt in themeVariantOptions"
                    :value="opt"
                    :key="opt"
                    variant="flat"
                    class="px-5 py-4"
                  >
                    {{ caps(opt) }}
                  </v-chip>
                </v-chip-group>
              </div>
            </div>
          </v-card>
        </v-col>

        <!-- Active Theme Palette Visualizer -->
        <v-col cols="12" lg="5">
          <v-card class="bg-surface-container-low h-100" flat rounded="xl" border>
            <div
              class="bg-surface-container-high px-6 py-4 rounded-t-xl d-flex align-center justify-space-between border-b"
            >
              <span class="text-h6 font-weight-medium text-on-surface">Active Swatches</span>
              <v-icon color="secondary" size="large">mdi-eyedropper</v-icon>
            </div>

            <div class="pa-6">
              <p class="text-body-2 text-on-surface-variant mb-4">
                This visualization shows how your currently active scheme translates to different UI
                elements within the app.
              </p>

              <div class="swatch-grid">
                <v-card
                  v-for="swatch in previewSwatches"
                  :key="swatch.name"
                  :class="[swatch.bg, swatch.text, 'swatch-card border']"
                  flat
                  rounded="lg"
                >
                  <div class="pa-3 d-flex flex-column justify-between h-100">
                    <div>
                      <div class="text-caption font-weight-black lh-tight">{{ swatch.name }}</div>
                      <div class="swatch-class-label mt-1 text-lowercase opacity-70">
                        {{ swatch.bg }}
                      </div>
                    </div>
                    <div
                      class="text-right text-caption swatch-desc opacity-75 mt-3 pt-2 border-t border-opacity-10"
                    >
                      {{ swatch.desc }}
                    </div>
                  </div>
                </v-card>
              </div>
            </div>
          </v-card>
        </v-col>
      </v-row>

      <!-- Section: Placeholder Other Settings -->
      <div class="mt-8 border-t pt-6">
        <h3 class="text-h6 font-weight-medium text-on-surface-variant mb-2">
          Other Settings Placeholder
        </h3>
        <p class="text-body-2 text-on-surface-variant">
          Configure system features, import profiles, and data synchronizations here.
        </p>
      </div>
    </div>
  </main-layout-container>
</template>

<style scoped>
.max-width-container {
  max-width: 1400px;
  margin: 0 auto;
}

.time-picker-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
}

.gap-2 {
  gap: 8px;
}

.lh-tight {
  line-height: 1.2;
}

/* Custom CSS-Grid for Swatches */
.swatch-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 12px;
}

.swatch-card {
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
  min-height: 100px;
}

.swatch-card:hover {
  transform: translateY(-2px);
}

.swatch-class-label {
  font-family: monospace;
  font-size: 0.7rem;
}

.swatch-desc {
  font-size: 0.72rem;
}
</style>
