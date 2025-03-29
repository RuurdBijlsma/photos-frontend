<script setup lang="ts">
import { ref } from 'vue'
import { scheme } from '@/plugins/vuetify'

const upEnabled = ref(false)
const forwardEnabled = ref(false)
const backEnabled = ref(false)
const refreshLoading = ref(false)

function openFolder(folder: string) {
  console.log('open', folder)
}

function selectFolder(folder: string) {
  console.log('select', folder)
}
</script>

<template>
  <v-card
    variant="flat"
    class="folder-picker"
    :color="scheme.surface_container_highest"
  >
    <v-card-text>
      <div class="picker-header">
        <div class="header-buttons">
          <v-btn
            :color="scheme.primary"
            class="mr-2"
            title="Go forward"
            variant="text"
            :disabled="!forwardEnabled"
            density="compact"
            icon="mdi-arrow-left"
          />
          <v-btn
            :color="scheme.primary"
            class="mr-2"
            title="Go back"
            variant="text"
            :disabled="!backEnabled"
            density="compact"
            icon="mdi-arrow-right"
          />
          <v-btn
            :color="scheme.primary"
            class="mr-2"
            variant="text"
            :disabled="!upEnabled"
            title="Move up a folder."
            density="compact"
            icon="mdi-arrow-up"
          />
          <v-dialog max-width="500">
            <template v-slot:activator="{ props: activatorProps }">
              <v-btn
                :color="scheme.primary"
                class="mr-2"
                variant="text"
                title="Create folder"
                density="compact"
                icon="mdi-folder-plus-outline"
                v-bind="activatorProps"
              />
            </template>

            <template v-slot:default="{ isActive }">
              <v-card title="Create folder" variant="flat" class="rounded-xl">
                <v-card-text>
                  <v-text-field
                    label="Folder name"
                    placeholder="Enter folder name"
                    prepend-icon="mdi-folder-plus-outline"
                    variant="outlined"
                    :hide-details="true"
                    rounded
                    :color="scheme.primary"
                    :base-color="scheme.outline"
                  />
                </v-card-text>
                <v-card-actions>
                  <v-btn>Create</v-btn>
                </v-card-actions>
              </v-card>
            </template>
          </v-dialog>
        </div>
        <div class="current-route-display">
          <div class="route-component route-root">Media Folder</div>
          <v-icon icon="mdi-chevron-right" />
          <div class="route-component">Ruurd</div>
        </div>
        <div class="header-buttons">
          <v-btn
            :color="scheme.primary"
            class="ml-2"
            variant="text"
            density="compact"
            icon="mdi-refresh"
            :loading="refreshLoading"
          />
        </div>
      </div>
      <div class="picker-entries mt-5">
        <v-list-item
          rounded
          @dblclick="openFolder('folder1')"
          @click="selectFolder('folder1')"
          prepend-icon="mdi-folder-outline"
          title="folder1"
        ></v-list-item>
        <v-list-item
          rounded
          @dblclick="openFolder('folder1')"
          @click="selectFolder('folder2')"
          prepend-icon="mdi-folder-outline"
          title="folder2"
        ></v-list-item>
        <v-list-item
          rounded
          @dblclick="openFolder('folder1')"
          @click="selectFolder('folder3')"
          prepend-icon="mdi-folder-check"
          class="selected-folder"
          title="folder3"
        ></v-list-item>
      </div>
    </v-card-text>
  </v-card>
</template>

<style scoped>
.picker-header {
  display: flex;
  align-items: center;
}

.current-route-display {
  display: flex;
  border-radius: 15px;
  padding: 4px 15px;
  flex-grow: 1;
  font-size: 14px;
  font-weight: 500;
  align-items: center;
  background-color: rgba(0, 0, 0, 0.08);
}

.header-buttons {
  opacity: 0.6;
}

.selected-folder {
  background-color: rgba(0, 0, 0, 0.08);
}

.folder-picker {
  border-radius: 32px;
  padding: 15px;
}
</style>
