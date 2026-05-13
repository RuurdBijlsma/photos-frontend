<script setup lang="ts">
import { ref, computed } from 'vue'
import ThumbnailImg from '@/vues/components/ui/ThumbnailImg.vue'
import type { FullMediaItem } from '@/scripts/types/api/fullPhoto.ts'

const props = defineProps<{
  mediaItem: FullMediaItem
}>()

const emit = defineEmits(['closeDialog'])

// State for the picker
const menu = ref(false)
const adjustedDate = ref(new Date(props.mediaItem.taken_at_local))

// Timezone Logic
const timezoneDisplay = computed(() => {
  const tz = props.mediaItem.time?.timezone_name
  if (!tz) return 'an unknown timezone'
  return /^[+-]\d{2}:\d{2}$/.test(tz) ? `UTC${tz}` : tz
})

// Formatters
const formatDate = (date: Date) => {
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`
}

const formatTime = (date: Date) => {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`
}

const originalDate = new Date(props.mediaItem.taken_at_local)

function revert() {
  adjustedDate.value = new Date(props.mediaItem.taken_at_local)
}

function save() {
  // Logic to update the server would go here
  console.log('Saving ISO:', adjustedDate.value.toISOString())
  emit('closeDialog')
}

// Time update helper for the manual input
function updateTime(type: 'h' | 'm' | 's', val: string) {
  const newDate = new Date(adjustedDate.value)
  const num = Math.max(0, parseInt(val) || 0)
  if (type === 'h') newDate.setHours(Math.min(23, num))
  if (type === 'm') newDate.setMinutes(Math.min(59, num))
  if (type === 's') newDate.setSeconds(Math.min(59, num))
  adjustedDate.value = newDate
}
</script>

<template>
  <v-card class="edit-date-card pa-6" color="surface-container" rounded="xl">
    <v-card-title class="text-center text-h5 font-weight-bold pb-2">
      Adjust Date and Time
    </v-card-title>

    <div class="d-flex flex-column align-center">
      <v-avatar size="110" rounded="lg" class="mb-4 elevation-3">
        <thumbnail-img cover :media-item-id="mediaItem?.id" />
      </v-avatar>

      <p class="text-caption text-medium-emphasis text-center mb-6 px-4">
        All times are listed in {{ timezoneDisplay }}
      </p>

      <!-- Original (Read Only) -->
      <div class="time-row mb-3 mt-6">
        <span class="label text-on-surface-variant">Original:</span>
        <div class="display-box original">
          {{ formatDate(originalDate) }}, {{ formatTime(originalDate) }}
        </div>
      </div>

      <!-- Adjusted (Clickable to Edit) -->
      <div class="time-row mb-2">
        <span class="label text-on-surface-variant">Adjusted:</span>

        <v-menu
          v-model="menu"
          :close-on-content-click="false"
          location="bottom center"
          transition="scale-transition"
        >
          <template v-slot:activator="{ props: menuProps }">
            <div class="display-box adjusted clickable" v-bind="menuProps" v-ripple>
              <span>{{ formatDate(adjustedDate) }}, {{ formatTime(adjustedDate) }}</span>
              <v-icon icon="mdi-calendar-edit" size="small" color="primary" class="ml-auto" />
            </div>
          </template>

          <!-- The actual picker content -->
          <v-card color="surface-container-high" elevation="12" rounded="lg" class="pa-2">
            <v-date-picker v-model="adjustedDate" color="primary" hide-header />

            <v-divider class="mx-4" />

            <div class="pa-4 d-flex align-center justify-center">
              <v-icon icon="mdi-clock-outline" class="mr-3" color="primary" />
              <div class="time-picker-inputs d-flex align-center">
                <input
                  class="t-input"
                  type="number"
                  :value="adjustedDate.getHours()"
                  @input="(e) => updateTime('h', (e.target as HTMLInputElement).value)"
                />
                <span class="mx-1">:</span>
                <input
                  class="t-input"
                  type="number"
                  :value="adjustedDate.getMinutes()"
                  @input="(e) => updateTime('m', (e.target as HTMLInputElement).value)"
                />
                <span class="mx-1">:</span>
                <input
                  class="t-input"
                  type="number"
                  :value="adjustedDate.getSeconds()"
                  @input="(e) => updateTime('s', (e.target as HTMLInputElement).value)"
                />
              </div>
            </div>

            <v-card-actions>
              <v-spacer />
              <v-btn color="primary" variant="text" @click="menu = false">Set Time</v-btn>
            </v-card-actions>
          </v-card>
        </v-menu>
      </div>

      <v-btn
        variant="text"
        color="primary"
        class="text-none font-weight-bold"
        rounded="pill"
        @click="revert"
      >
        Revert to Original
      </v-btn>
    </div>

    <v-card-actions class="mt-6 pa-0 gap-3">
      <v-btn
        variant="flat"
        color="surface-variant"
        height="50"
        class="flex-grow-1 text-none font-weight-bold"
        rounded="lg"
        @click="emit('closeDialog')"
      >
        Cancel
      </v-btn>
      <v-btn
        variant="flat"
        color="primary"
        height="50"
        class="flex-grow-1 text-none font-weight-bold"
        rounded="lg"
        @click="save"
      >
        Save
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<style scoped>
.edit-date-card {
  /* Matching the backdrop-blur feel from your MediaInfoPanel */
  backdrop-filter: blur(10px);
  background-color: rgba(var(--v-theme-surface-container), 0.9) !important;
}

.time-row {
  display: flex;
  align-items: center;
  width: 100%;
  max-width: 380px;
}

.label {
  width: 85px;
  font-size: 15px;
  font-weight: 600;
}

.display-box {
  flex-grow: 1;
  padding: 10px 16px;
  border-radius: 10px;
  font-size: 16px;
  display: flex;
  align-items: center;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.1);
}

.original {
  background-color: rgba(var(--v-theme-on-surface), 0.05);
  color: rgba(var(--v-theme-on-surface), 0.4);
  font-family:
    Roboto Mono,
    Menlo,
    Consolas,
    monospace;
}

.adjusted {
  background-color: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  font-family:
    Roboto Mono,
    Menlo,
    Consolas,
    monospace;
}

.clickable {
  cursor: pointer;
  transition: transform 0.1s;
}
.clickable:active {
  transform: scale(0.98);
}

/* Time Input styling for the picker menu */
.t-input {
  width: 40px;
  text-align: center;
  background: rgba(var(--v-theme-on-surface), 0.05);
  border: none;
  border-radius: 4px;
  color: inherit;
  font-family: monospace;
  font-size: 1.1rem;
  padding: 4px;
}
.t-input:focus {
  outline: 2px solid rgb(var(--v-theme-primary));
}

/* Chrome/Safari hide number arrows */
input::-webkit-outer-spin-button,
input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

:deep(.v-date-picker) {
  background-color: transparent !important;
}
</style>
