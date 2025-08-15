<script setup lang="ts">
import { ref, watch } from 'vue'
import { scheme } from '@/plugins/vuetify'
import { usePickFolderStore } from '@/stores/pickFolder'

const folders = usePickFolderStore()
const newFolderName = ref('')

watch(
  () => folders.viewedFolder,
  () => onViewedChange(),
  { deep: true },
)

async function onViewedChange() {
  setTimeout(() => {
    const el = document.querySelector('.current-route-display')
    if (el) el.scrollLeft = el.scrollWidth - el.clientWidth
  }, 50)
}

async function makeFolder(isActive: { value: boolean }) {
  isActive.value = false
  await folders.makeFolder(newFolderName.value)
  newFolderName.value = ''
}

folders.refreshFolders().then()
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
            variant="text"
            :disabled="folders.viewedFolder.length === 0"
            @click="folders.truncateViewed(folders.viewedFolder.length - 1)"
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
                    autofocus
                    label="Folder name"
                    placeholder="Enter folder name"
                    prepend-icon="mdi-folder-plus-outline"
                    v-model="newFolderName"
                    variant="outlined"
                    @keyup.enter="makeFolder(isActive)"
                    :hide-details="true"
                    rounded
                    :color="scheme.primary"
                    :base-color="scheme.outline"
                  />
                </v-card-text>
                <v-card-actions>
                  <v-btn @click="makeFolder(isActive)">Create</v-btn>
                </v-card-actions>
              </v-card>
            </template>
          </v-dialog>
        </div>
        <div class="current-route-display">
          <div
            class="route-component route-root"
            v-ripple
            @click="folders.truncateViewed(0)"
          >
            Media Root
          </div>
          <template
            v-for="(component, index) in folders.viewedFolder"
            :key="index"
          >
            <v-icon icon="mdi-chevron-right" />
            <div
              class="route-component"
              v-ripple
              @click="folders.truncateViewed(index + 1)"
            >
              {{ component }}
            </div>
          </template>
        </div>
        <div class="header-buttons">
          <v-btn
            :color="scheme.primary"
            class="ml-2"
            variant="text"
            density="compact"
            icon="mdi-refresh"
            @click="folders.refreshFolders"
            :loading="folders.listFolderLoading"
          />
        </div>
      </div>
      <div class="picker-entries mt-5">
        <p
          class="text-caption text-center font-italic"
          v-if="folders.folderList.length === 0"
        >
          There are no folders here.
        </p>
        <v-list-item
          v-for="folder in folders.folderList"
          :key="folder"
          class="rounded-xl"
          @click="folders.openFolder(folder)"
          prepend-icon="mdi-folder-outline"
          :title="folder"
        ></v-list-item>
      </div>
    </v-card-text>
  </v-card>
</template>

<style scoped>
.folder-picker {
  border-radius: 50px;
  padding: 15px;
  margin-left: -15px;
  margin-right: -15px;
}

.picker-header {
  display: flex;
  align-items: center;
}

.current-route-display {
  display: flex;
  border-radius: 15px;
  padding: 2px 7px;
  flex-grow: 1;
  font-size: 14px;
  font-weight: 500;
  align-items: center;
  background-color: rgba(0, 0, 0, 0.08);
  overflow-x: auto;
  scroll-behavior: smooth;
}

.current-route-display::-webkit-scrollbar {
  display: none;
}

.route-root {
  font-weight: bold;
  opacity: 0.5;
}

.route-component {
  cursor: pointer;
  white-space: nowrap;
  padding: 2px 8px;
  border-radius: 15px;
}

.route-component:hover {
  text-decoration: underline;
}

.header-buttons {
  opacity: 0.6;
}

.header-buttons:first-child {
  min-width: 75px;
}

.picker-entries {
  height: 180px;
  max-height: 340px;
  overflow-y: auto;
}
</style>
