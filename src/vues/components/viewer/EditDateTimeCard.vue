<script setup lang="ts">
import { ref, computed } from 'vue'
import ThumbnailImg from '@/vues/components/ui/ThumbnailImg.vue'
import type { FullMediaItem } from '@/scripts/types/api/fullPhoto.ts'
import DateTimePicker from '@/vues/components/viewer/DateTimePicker.vue'

const props = defineProps<{
  mediaItem: FullMediaItem
}>()

const emit = defineEmits(['closeDialog'])

// State for the picker
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
</script>

<template>
  <v-card class="edit-date-card pa-6" color="surface-container" rounded="xl">
    <v-card-title class="text-center mb-3"> Adjust Date and Time </v-card-title>

    <div class="d-flex flex-column align-center">
      <v-avatar size="110" rounded="lg" class="mb-5 elevation-3">
        <thumbnail-img cover :media-item-id="mediaItem?.id" />
      </v-avatar>

      <p class="text-smallish text-medium-emphasis text-center mb-6 px-4">
        All times are listed in {{ timezoneDisplay }}
      </p>

      <!-- Original (Read Only) -->
      <div class="time-row mb-3 mt-4">
        <span class="dt-label text-on-surface-variant">Original:</span>
        <div class="display-box original">
          {{ formatDate(originalDate) }}, {{ formatTime(originalDate) }}
        </div>
      </div>

      <!-- Adjusted (Clickable to Edit) -->
      <div class="time-row mb-2">
        <span class="dt-label text-on-surface-variant">Adjusted:</span>

        <date-time-picker v-model="adjustedDate" />
      </div>

      <v-btn variant="plain" color="primary" rounded="pill" @click="revert">
        Revert to Original
      </v-btn>
    </div>

    <v-card-actions class="mt-7">
      <v-btn variant="text" rounded @click="emit('closeDialog')"> Cancel </v-btn>
      <v-btn variant="tonal" color="primary" rounded @click="save"> Save </v-btn>
    </v-card-actions>
  </v-card>
</template>

<style scoped>
.edit-date-card {
  background-color: rgba(var(--v-theme-surface-container), 0.8) !important;
  backdrop-filter: saturate(250%) blur(12px) !important;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.time-row {
  display: flex;
  align-items: center;
  width: 100%;
  max-width: 380px;
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

.text-smallish {
  font-size: 14px;
  font-weight: 500;
}
.dt-label {
  font-weight: 500;
  font-size: 14px;
  margin-right: 10px;
  width: 75px;
}
</style>
