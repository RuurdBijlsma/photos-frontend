<!-- File: src/vues/components/settings/UiSettings.vue -->
<script setup lang="ts">
import { useSettingStore } from '@/scripts/stores/settingsStore.ts'
import ViewPhoto from '@/vues/views/main/ViewPhoto.vue'
import { ref } from 'vue'
import { SimpleTimelineItem } from '@/scripts/types/generated/timeline.ts'
import searchService from '@/scripts/services/searchService.ts'
import SimpleTimeline from '@/vues/components/timeline/simple-timeline/SimpleTimeline.vue'
import { useEventListener } from '@vueuse/core'

const settings = useSettingStore()

const rowHeightEditing = ref(false)
useEventListener(document, 'mouseup', () => (rowHeightEditing.value = false))

const previewTimeline = ref<SimpleTimelineItem[]>([])
searchService.search({ query: 'sunset', limit: 10, mediaType: 'photo' }).then((items) => {
  previewTimeline.value = items.items
})
</script>

<template>
  <div class="ui-settings-layout">
    <simple-timeline
      v-if="rowHeightEditing"
      hide-scroll-bar
      class="timeline-preview"
      :timeline-items="previewTimeline"
      view-link="/settings/view/"
      :ideal-row-height="settings.timelineRowHeight"
      :style="{
        height: settings.timelineRowHeight + 100 + 'px',
      }"
    />
    <!-- Settings Configuration Panel -->
    <section class="config-panel">
      <v-card class="settings-card" flat border>
        <!-- Card Header -->
        <div class="card-header">
          <span class="card-title">User Interface Options</span>
          <v-icon color="primary" size="large">mdi-monitor-dashboard</v-icon>
        </div>

        <div class="card-body">
          <!-- Section: Photo Viewer Settings -->
          <div class="section-divider">
            <span class="section-label">Photo Viewer</span>
            <v-divider class="divider-line" />
          </div>

          <div class="settings-group">
            <v-switch
              v-model="settings.darkPhotoViewer"
              label="Force Dark Mode in Viewer"
              hint="Always displays the photo viewer with a dark theme, regardless of app theme"
              persistent-hint
              color="primary"
              inset
              density="comfortable"
              class="setting-switch"
            />
            <v-switch
              v-model="settings.useImageGlow"
              label="Ambient Image Glow"
              hint="Adds a soft glowing background reflecting the colors of the active image"
              persistent-hint
              color="primary"
              inset
              density="comfortable"
              class="setting-switch mt-4"
            />
          </div>

          <!-- Section: Timeline Settings -->
          <div class="section-divider mt-6">
            <span class="section-label">Timeline Layout</span>
            <v-divider class="divider-line" />
          </div>

          <div class="settings-group">
            <div class="slider-wrapper">
              <span class="slider-label"
                >Timeline Row Height: {{ settings.timelineRowHeight }}px</span
              >
              <v-slider
                v-model="settings.timelineRowHeight"
                @mousedown="rowHeightEditing = true"
                :min="50"
                :max="1000"
                :step="5"
                color="primary"
                track-color="surface-container-high"
                hide-details
                class="mt-2"
              />
            </div>

            <v-switch
              v-model="settings.timelineUseDayLabels"
              label="Show Daily Group Headers"
              hint="Display date and location banners separating images by day"
              persistent-hint
              color="primary"
              inset
              density="comfortable"
              class="setting-switch mt-4"
            />
          </div>

          <!-- Section: General Aesthetics -->
          <div class="section-divider mt-6">
            <span class="section-label">General Aesthetics</span>
            <v-divider class="divider-line" />
          </div>

          <div class="settings-group">
            <v-switch
              v-model="settings.useBackdropBlur"
              label="Backdrop Blur Effects"
              hint="Enables blur on sidebars, dialogs, and headers. Disabling can improve UI performance."
              persistent-hint
              color="primary"
              inset
              density="comfortable"
              class="setting-switch"
            />
          </div>
        </div>
      </v-card>
    </section>

    <!-- Interactive Live UI Preview -->
    <aside class="preview-panel">
      <v-card class="settings-card height-100" flat border>
        <div class="card-header">
          <span class="card-title">Live Preview</span>
          <v-icon color="secondary" size="large">mdi-eye-outline</v-icon>
        </div>

        <div class="card-body preview-container">
          <p class="preview-desc">
            Preview how your settings change the look and behavior of the application.
          </p>

          <!-- Preview Element 1: Photo Viewer & Glow -->
          <div class="preview-element mt-4" v-if="previewTimeline.length > 0">
            <div class="preview-element-title">Viewer Ambient Glow & Theme</div>
            <div class="viewer-preview-box">
              <div class="preview-scale">
                <view-photo :override-id="previewTimeline[0]!.id" muted />
              </div>
            </div>
          </div>

          <!-- Preview Element 2: Backdrop blur -->
          <div class="preview-element mt-6">
            <div class="preview-element-title">Backdrop Blur</div>
            <div class="blur-preview-box">
              <div class="colorful-bg">
                <div class="color-dot dot-1"></div>
                <div class="color-dot dot-2"></div>
              </div>
              <div class="blur-overlay" :class="{ 'apply-blur': settings.useBackdropBlur }">
                <span class="blur-status-text">
                  Blur: {{ settings.useBackdropBlur ? 'Enabled' : 'Disabled' }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </v-card>
    </aside>
  </div>
</template>

<style scoped>
.timeline-preview {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  opacity: 0.6;
}

.ui-settings-layout {
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
}

@media (min-width: 1280px) {
  .ui-settings-layout {
    grid-template-columns: 7fr 5fr;
  }
}

.settings-card {
  background-color: rgb(var(--v-theme-surface-container-low)) !important;
  border-radius: 24px !important;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity)) !important;
}

.height-100 {
  height: 100%;
}

.card-header {
  background-color: rgb(var(--v-theme-surface-container-high));
  padding: 16px 24px;
  border-top-left-radius: 24px;
  border-top-right-radius: 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.card-title {
  font-size: 1.25rem;
  font-weight: 500;
  color: rgb(var(--v-theme-on-surface));
}

.card-body {
  padding: 24px;
}

.section-divider {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
}

.section-label {
  font-size: 0.9rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  color: rgb(var(--v-theme-primary));
  white-space: nowrap;
}

.divider-line {
  margin-left: 16px;
  opacity: 0.3;
}

.settings-group {
  display: flex;
  flex-direction: column;
}

.slider-wrapper {
  background-color: rgb(var(--v-theme-surface-container-high));
  padding: 16px;
  border-radius: 12px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  margin-bottom: 12px;
}

.slider-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: rgb(var(--v-theme-on-surface));
  display: block;
}

.preview-desc {
  font-size: 0.875rem;
  color: rgb(var(--v-theme-on-surface-variant));
  margin-bottom: 16px;
}

.preview-element {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.preview-element-title {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: rgb(var(--v-theme-secondary));
}

.viewer-preview-box {
  border-radius: 12px;
  padding: 0;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  transition:
    background-color 0.3s ease,
    color 0.3s ease;
  background-color: rgb(var(--v-theme-surface-container-high));
  height: 133px;
  width: 400px;
  overflow: hidden;
  position: relative;
}

.preview-scale {
  position: absolute;
  top: 0;
  left: 0;
  width: 900px;
  height: 300px;
  transform: scale(0.444444);
  transform-origin: top left;
  pointer-events: none;
}

/* Timeline Simulation */
.timeline-preview-box {
  background-color: rgb(var(--v-theme-surface-container-high));
  border-radius: 12px;
  padding: 12px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.mock-day-label {
  font-size: 0.7rem;
  font-weight: 700;
  background-color: rgb(var(--v-theme-surface-container-highest));
  color: rgb(var(--v-theme-on-surface));
  padding: 4px 8px;
  border-radius: 6px;
  align-self: flex-start;
  display: flex;
  align-items: center;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.mock-row {
  display: flex;
  gap: 6px;
  transition: height 0.3s ease;
  overflow: hidden;
}

.mock-photo-card {
  flex: 1;
  height: 100%;
  border-radius: 6px;
  display: flex;
  align-items: flex-end;
  padding: 6px;
  background-position: center;
  background-size: cover;
  background-repeat: no-repeat;
  position: relative;
  border: 1px solid rgba(var(--v-border-color), 0.15);
}

.photo-index {
  font-size: 0.65rem;
  font-weight: bold;
  color: white;
  background: rgba(0, 0, 0, 0.4);
  padding: 1px 5px;
  border-radius: 4px;
}

.timeline-scale-indicator {
  font-size: 0.7rem;
  opacity: 0.6;
  text-align: right;
}

/* Backdrop Blur Simulation */
.blur-preview-box {
  position: relative;
  height: 100px;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.colorful-bg {
  position: absolute;
  width: 100%;
  height: 100%;
  background: rgb(var(--v-theme-surface-container-high));
  overflow: hidden;
}

.color-dot {
  position: absolute;
  border-radius: 50%;
}

.dot-1 {
  width: 60px;
  height: 60px;
  top: 10px;
  left: 20%;
  background-color: rgb(var(--v-theme-primary));
}

.dot-2 {
  width: 50px;
  height: 50px;
  bottom: 10px;
  right: 20%;
  background-color: rgb(var(--v-theme-tertiary));
}

.blur-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(var(--v-theme-surface-container-low), 0.45);
  z-index: 2;
  transition:
    backdrop-filter 0.3s ease,
    background-color 0.3s ease;
}

.blur-overlay.apply-blur {
  backdrop-filter: blur(8px);
  background: rgba(var(--v-theme-surface-container-low), 0.25);
}

.blur-status-text {
  font-size: 0.8rem;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
  background-color: rgb(var(--v-theme-surface-container-high));
  padding: 6px 12px;
  border-radius: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
</style>
