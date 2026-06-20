<script setup lang="ts">
import { TIMELINE_ROW_HEIGHT, useSettingStore } from '@/scripts/stores/settingsStore.ts'

const settings = useSettingStore()

const emit = defineEmits(['rowHeightEditing'])
</script>

<template>
  <div class="slider-wrapper">
    <span class="slider-label">
      Timeline Row Height:
      <span class="contrast-value-label"> {{ settings.timelineRowHeight }}</span
      >px
    </span>
    <div class="slider-flex">
      <v-slider
        v-model="settings.timelineRowHeight"
        @mousedown="emit('rowHeightEditing')"
        :min="50"
        :max="1000"
        :step="5"
        color="primary"
        hide-details
        class="mt-2"
      />
      <v-btn
        class="slider-reset-button"
        color="tertiary"
        @click="settings.timelineRowHeight = TIMELINE_ROW_HEIGHT"
        rounded
        density="compact"
        variant="plain"
        >Reset</v-btn
      >
    </div>
    <span class="slider-desc">
      <em>Target</em> height for the rows on the front page photo grid.
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
