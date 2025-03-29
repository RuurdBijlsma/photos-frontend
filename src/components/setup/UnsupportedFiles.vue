<script setup lang="ts">
import type { FileCountResponse } from '@/utils/api/types'
import { computed } from 'vue'
import { scheme } from '@/plugins/vuetify'

const props = defineProps<{
  summary: FileCountResponse
}>()

const virtualScrollHeight = computed(() => {
  const count = Object.keys(props.summary.unsupported_files).length
  if (count >= 8) {
    return 300
  }
  return count * 36 + 4
})
</script>

<template>
  <v-card
    class="mb-6 folder-card"
    variant="text"
    rounded
    :color="scheme.primary"
  >
    <v-card-title class="d-flex align-center card-title">
      <v-icon icon="mdi-alert-circle-outline" class="mr-2"></v-icon>
      Unsupported Files ({{ summary.unsupported_count.toLocaleString() }})
    </v-card-title>
    <v-card-text>
      <p class="mb-3 text-caption text-medium-emphasis">
        Files with the following extensions will not be processed or shown by in
        Ruurd Photos, as they are not compatible with our media processor.
      </p>
      <div class="ext-list">
        <v-virtual-scroll
          :height="virtualScrollHeight"
          :items="Object.keys(summary.unsupported_files)"
        >
          <template v-slot:default="{ item }">
            <v-dialog max-width="500">
              <template v-slot:activator="{ props: activatorProps }">
                <v-list-item
                  density="compact"
                  rounded-xl
                  v-tooltip="`.${item}`"
                  class="ma-1"
                  v-bind="activatorProps"
                  prepend-icon="mdi-file-alert-outline"
                >
                  {{ item }}
                </v-list-item>
              </template>

              <template v-slot:default="{ isActive }">
                <v-card
                  v-tooltip="
                    `${summary.unsupported_files[item].length.toLocaleString()} Unsupported .${item} Files`
                  "
                >
                  <v-card-text>
                    <v-list>
                      <v-virtual-scroll
                        :height="400"
                        :items="summary.unsupported_files[item]"
                      >
                        <template v-slot:default="{ item }">
                          <v-list-item>
                            <template v-slot:prepend>
                              <v-icon icon="mdi-file"></v-icon>
                            </template>
                            <v-list-item-title :title="item">
                              {{ item }}
                            </v-list-item-title>
                          </v-list-item>
                        </template>
                      </v-virtual-scroll>
                    </v-list>
                  </v-card-text>

                  <v-card-actions>
                    <v-spacer></v-spacer>

                    <v-btn
                      text="Dismiss"
                      @click="isActive.value = false"
                    ></v-btn>
                  </v-card-actions>
                </v-card>
              </template>
            </v-dialog>
          </template>
        </v-virtual-scroll>
      </div>
    </v-card-text>
  </v-card>
</template>

<style scoped>
.ext-list {
  background-color: rgba(255, 255, 255, 0.3);
  border-radius: 24px;
  overflow: hidden;
}
</style>
