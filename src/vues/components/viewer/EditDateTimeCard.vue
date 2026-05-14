<script setup lang="ts">
import { ref, computed } from 'vue'
import ThumbnailImg from '@/vues/components/ui/ThumbnailImg.vue'
import type { FullMediaItem } from '@/scripts/types/api/fullPhoto.ts'
import DateTimePicker from '@/vues/components/viewer/DateTimePicker.vue'
import { useMediaItemStore } from '@/scripts/stores/timeline/mediaItemStore.ts'

const props = defineProps<{
  mediaItem: FullMediaItem
}>()

const emit = defineEmits(['closeDialog'])
const mediaItemStore = useMediaItemStore()

const adjustedDate = ref(new Date(props.mediaItem.taken_at_local))
const originalDate = new Date(props.mediaItem.og_taken_at_local)

const timezoneDisplay = computed(() => {
  const tz = props.mediaItem.time?.timezone_name
  if (!tz) return 'the local timezone'
  return /^[+-]\d{2}:\d{2}$/.test(tz) ? `UTC${tz}` : tz
})

function revert() {
  adjustedDate.value = new Date(props.mediaItem.og_taken_at_local)
}

async function save() {
  if (!props.mediaItem) return
  const adjustedDateString =
    adjustedDate.value
      .toLocaleString('sv-SE', {
        hour12: false,
      })
      .replace(' ', 'T') + '.000Z'
  await mediaItemStore.updateMediaItem(props.mediaItem.id, {
    takenAtLocal: adjustedDateString,
  })
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

      <div class="time-row mb-3 mt-4">
        <span class="dt-label text-on-surface-variant">Original:</span>
        <date-time-picker disabled v-model="originalDate" />
      </div>

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
