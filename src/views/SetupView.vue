<script setup lang="ts">
import { ref, watch } from 'vue'
import {
  type RouteLocationNormalizedLoadedGeneric,
  useRoute,
  useRouter,
} from 'vue-router'
import { scheme } from '@/plugins/vuetify'
import CheckDrivesTab from '@/views/setup/CheckDrivesTab.vue'
import PickFolderTab from '@/views/setup/PickFolderTab.vue'
import MyMainContainer from '@/components/my-theme/MyMainContainer.vue'
import SetupLayout from '@/components/my-theme/SetupLayout.vue'
import SkippedFilesTab from '@/views/setup/SkippedFilesTab.vue'
import { usePickFolderStore } from '@/stores/pickFolder'

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
const folders = usePickFolderStore()
watch(tabIndex, () => {
  console.log(tabIndex.value)
  if(tabIndex.value===3){
    folders.refreshUnsupportedFiles().then()
  }
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
  <my-main-container>
    <setup-layout
      :caption-text="false"
      text="Now, let's configure your library and settings.
      Make sure your media library is set up correctly, then enter your server URL to continue."
    />

    <v-stepper
      :color="scheme.primary"
      v-model="tabIndex"
      class="stepper"
      editable
      :items="['Drives', 'User Folder', 'Skipped files', 'Go!']"
    >
      <template v-slot:item.1>
        <check-drives-tab />
      </template>

      <template v-slot:item.2>
        <pick-folder-tab />
      </template>

      <template v-slot:item.3>
        <skipped-files-tab />
      </template>

      <template v-slot:item.4>
        <v-card title="Step Three" flat>...</v-card>
      </template>
    </v-stepper>
  </my-main-container>
</template>

<style scoped></style>
