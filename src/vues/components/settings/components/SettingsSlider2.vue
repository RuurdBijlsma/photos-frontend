<script setup lang="ts">
import { CUSTOM_THEME_CONTRAST, useSettingStore } from '@/scripts/stores/settingsStore.ts'

const settings = useSettingStore()
</script>
<template>
  <div class="slider-wrapper">
    <span class="slider-label">
      UI Contrast:
      <span class="contrast-value-label">
        {{ settings.customThemeContrast > 0 ? '+' : ''
        }}{{ settings.customThemeContrast.toFixed(1) }}
      </span>
    </span>
    <div class="slider-flex">
      <v-slider
        v-model="settings.customThemeContrast"
        min="-1.0"
        max="1.0"
        show-ticks
        step="0.1"
        hide-details
        color="primary"
        hint="Adjust color luminance contrast (with -1.0 as low-contrast, 0.0 as standard, and 1.0 as maximum contrast)."
        persistent-hint
      />
      <v-btn
        class="slider-reset-button"
        color="tertiary"
        @click="settings.customThemeContrast = CUSTOM_THEME_CONTRAST"
        rounded
        density="compact"
        variant="plain"
        >Reset</v-btn
      >
    </div>
    <span class="slider-desc">
      Adjust color luminance contrast (with -1.0 as low-contrast, 0.0 as standard, and 1.0 as
      maximum contrast).
    </span>
  </div>
</template>

<style scoped>
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

.contrast-value-label {
  font-weight: 700;
  min-width: 44px;
  margin-left: 10px;
  text-align: right;
  color: rgb(var(--v-theme-primary));
}

.slider-flex {
  display: flex;
  align-items: center;
  gap: 10px;
}

.slider-reset-button {
  transform: translateY(3px);
}

.slider-desc {
  font-size: 0.75rem;
  color: rgb(var(--v-theme-on-surface-variant));
  display: block;
}
</style>
