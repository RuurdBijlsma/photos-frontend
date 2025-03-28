<script setup lang="ts">
import { ref, watch } from 'vue'
import {
  type RouteLocationNormalizedLoadedGeneric,
  useRoute,
  useRouter,
} from 'vue-router'
import { scheme } from '@/plugins/vuetify'
import CheckDrives from '@/views/setup/CheckDrives.vue'
import PickAndPreviewFolder from '@/views/setup/PickAndPreviewFolder.vue'

const router = useRouter()
const route = useRoute()

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
  <v-main class="main" :style="{ backgroundColor: scheme.background }">
    <div
      class="container"
      :style="{ backgroundColor: scheme.surface_container_low }"
    >
      <div class="title-box">
        <div class="left-title">
          <div class="big-image"></div>
        </div>
        <div class="right-title">
          <h1 :style="{ color: scheme.on_surface_variant }">
            Set Up <span>Ruurd Photos</span>
          </h1>
          <p
            class="mt-2 text-caption"
            :style="{ color: scheme.on_surface_variant }"
          >
            Now, let's configure your library and settings. Make sure your media
            library is set up correctly, then enter your server URL to continue.
          </p>
        </div>
      </div>

      <v-divider class="mt-10 mb-5" />

      <v-stepper
        :color="scheme.primary"
        v-model="tabIndex"
        class="stepper"
        editable
        :items="['Validate Drives', 'Pick User Folder', 'Start Indexing']"
      >
        <template v-slot:item.1>
          <check-drives />
        </template>

        <template v-slot:item.2>
          <pick-and-preview-folder />
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
</style>
