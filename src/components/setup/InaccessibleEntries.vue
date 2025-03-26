<script setup lang="ts">
import type { FileCountResponse } from '@/utils/api/types'
import { computed } from 'vue'

const props = defineProps<{
  summary: FileCountResponse
}>()

const virtualScrollHeight = computed(() => {
  const count = props.summary.inaccessible_entries.length
  if (count >= 8) {
    return 500
  }
  return count * 32 + 20
})
</script>

<template>
  <v-card
    class="mb-6 folder-card"
    variant="text"
    rounded
    color="rgba(150,100,0,1)"
  >
    <v-card-title class="d-flex align-center card-title">
      <v-icon icon="mdi-alert-circle-outline" class="mr-2"></v-icon>
      Inaccessible Entries ({{
        summary.inaccessible_entries.length.toLocaleString()
      }})
    </v-card-title>
    <v-card-text>
      <p class="mb-3 text-caption text-medium-emphasis">
        Some items couldn't be accessed, so their contents won't be included.
      </p>
      <div class="ext-list" v-if="summary.unsupported_count > 0">
        <v-virtual-scroll
          :height="virtualScrollHeight"
          :items="summary.inaccessible_entries"
        >
          <template v-slot:default="{ item }">
            <v-list-item
              density="compact"
              rounded-xl
              v-tooltip="item"
              class="ma-1"
            />
          </template>
        </v-virtual-scroll>
      </div>
      <v-alert v-else type="success" variant="tonal" rounded>
        No unsupported files found - great job keeping your media library clean!
      </v-alert>
    </v-card-text>
  </v-card>
</template>

<style scoped>
.card-title {
  font-weight: 600;
  font-size: 17px;
}

.ext-list {
  background-color: rgba(255, 255, 255, 0.3);
  border-radius: 24px;
  overflow: hidden;
}
</style>
