<script setup lang="ts">
import FolderValidation from '@/components/setup/FolderValidation.vue'
import { useAuthStore } from '@/stores/auth'
import { ref, watch } from 'vue'
import {
  type RouteLocationNormalizedLoadedGeneric,
  useRoute,
  useRouter,
} from 'vue-router'
import { scheme } from '@/plugins/vuetify'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

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

function getStepFromRoute(
  r: RouteLocationNormalizedLoadedGeneric,
): number | null {
  const stepString = r.query.step?.toString()
  if (!stepString) return null
  const step = parseInt(stepString)
  if (step > 3 || step < 1) return null
  return step
}

function setStepFromRoute() {
  const step = getStepFromRoute(route)
  if (step === null || tabIndex.value === step) return
  tabIndex.value = step
}

const tabIndex = ref(0)
watch(tabIndex, () => {
  console.log(tabIndex.value)
  router.push({
    query: {
      step: tabIndex.value,
    },
  })
})
watch(route, setStepFromRoute)
setStepFromRoute()
</script>

<template>
  <v-main class="main" :style="{ backgroundColor: scheme.surface_container_low }">
    <div class="container" :style="{backgroundColor: scheme.surface_container}">
      <div class="title-box">
        <div class="left-title">
          <div class="big-image"></div>
        </div>
        <div class="right-title">
          <h1 :style="{color: scheme.on_surface_variant}">Set Up <span>Ruurd Photos</span></h1>
          <p class="mt-2 text-caption" :style="{color: scheme.on_surface_variant}">
            Now, let's configure your library and settings. Make sure your media
            library is set up correctly, then enter your server URL to continue.
          </p>
        </div>
      </div>

      <v-divider class="mt-10 mb-5" />

      <v-stepper
        v-model="tabIndex"
        class="stepper"
        editable
        :items="['Validate Drives', 'Configure', 'Start Indexing']"
      >
        <template v-slot:item.1>
          <folder-validation />
        </template>

        <template v-slot:item.2>
          <p class="text-medium-emphasis text-caption mb-3">
            Select the media folder where your
            <span :style="{ fontWeight: 700 }">({{ auth.user?.name }})</span>
            files are located. You can choose the root of the linked media
            directory or a specific folder. If you invite others, their media
            will be kept in separate folders.
          </p>
          <div class="folder-picker">
            <v-divider class="mt-2 mb-2" />
            <div class="picker-header">
              <div class="header-buttons">
                <v-btn
                  class="mr-2"
                  title="Go forward"
                  variant="text"
                  :disabled="!forwardEnabled"
                  density="compact"
                  icon="mdi-arrow-left"
                />
                <v-btn
                  class="mr-2"
                  title="Go back"
                  variant="text"
                  :disabled="!backEnabled"
                  density="compact"
                  icon="mdi-arrow-right"
                />
                <v-btn
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
                      class="mr-2"
                      variant="text"
                      title="Create folder"
                      density="compact"
                      icon="mdi-folder-plus-outline"
                      v-bind="activatorProps"
                    />
                  </template>

                  <template v-slot:default="{ isActive }">
                    <v-card title="Create folder">
                      <v-card-text>
                        <v-text-field
                          label="Folder name"
                          placeholder="Enter folder name"
                          prepend-icon="mdi-folder-plus-outline"
                          variant="outlined"
                          :hide-details="true"
                          rounded
                          color="primary"
                          base-color="rgba(0,0,0,0.5)"
                        />
                      </v-card-text>
                      <v-card-actions>
                        <v-btn> Create</v-btn>
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
                  class="ml-2"
                  variant="text"
                  density="compact"
                  icon="mdi-refresh"
                  :loading="refreshLoading"
                />
              </div>
            </div>
            <v-divider class="mt-2 mb-2" />
            <div class="picker-entries">
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
            <div class="show-selected-folder">
              <h3>Selected folder:</h3>
              <v-chip>/Ruurd/folder3</v-chip>
            </div>
          </div>
        </template>

        <template v-slot:item.3>
          <v-card title="Step Three" flat>...</v-card>
        </template>
      </v-stepper>
    </div>
  </v-main>
</template>

<style scoped>
.main {
  position: fixed;
  width: 100%;
  height: 100%;
  overflow-y: auto;
  padding-bottom: 100px;
}

.container {
  border-radius: 50px;
  overflow: hidden;
  max-width: 800px;
  padding: 30px 40px;
  margin: 100px auto 0;
  transition: box-shadow 0.3s ease;
}

.title-box {
  display: flex;
  gap: 40px;
  padding: 20px 20px 0;
}

.big-image {
  background-image: url('img/app-no-bg-1024.png');
  width: 100px;
  height: 100px;
  background-size: 90%;
  background-position: center;
}

.right-title {
  height: 100px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.container h1 {
  font-size: 35px;
  font-weight: 400;
  opacity: 0.9;
}

.container span {
  font-weight: 600;
}

.container:deep(.v-sheet) {
  background-color: transparent !important;
  box-shadow: none !important;
}

.container:deep(.v-stepper-header) {
  box-shadow: none !important;
}

.picker-header {
  display: flex;
  align-items: center;
}

.current-route-display {
  display: flex;
  background-color: rgba(0, 0, 0, 0.05);
  border-radius: 5px;
  padding: 4px 15px;
  flex-grow: 1;
  font-size: 14px;
  font-weight: 500;
}

.header-buttons {
  opacity: 0.6;
}

.selected-folder {
  background-color: rgba(0, 0, 0, 0.05);
}

.show-selected-folder {
  display: flex;
  gap: 25px;
  align-items: center;
  margin-top: 20px;
  font-weight: 600;
  font-size: 14px;
}
</style>
