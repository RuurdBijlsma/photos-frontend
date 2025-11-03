<script setup lang="ts">
import { ref, watch } from 'vue'
import { type RouteLocationNormalizedLoadedGeneric, useRoute, useRouter } from 'vue-router'
import CheckDrivesTab from '@/views/setup/CheckDrivesTab.vue'
import PickFolderTab from '@/views/setup/PickFolderTab.vue'
import MyMainContainer from '@/components/my-theme/MyMainContainer.vue'
import SetupLayout from '@/components/my-theme/SetupLayout.vue'
import SkippedFilesTab from '@/views/setup/SkippedFilesTab.vue'
import { usePickFolderStore } from '@/stores/pickFolderStore.ts'
import ConfirmSetupTab from '@/views/setup/ConfirmSetupTab.vue'
import { useSetupStore } from '@/stores/setupStore.ts'

const router = useRouter()
const route = useRoute()
const setupStore = useSetupStore()
const pickFolderStore = usePickFolderStore()
const isLoading = ref(false)

async function startProcessing() {
  isLoading.value = true
  try {
    await setupStore.startProcessing()
    console.log('Pushing ', { name: 'timeline' })
    await router.push({ name: 'timeline' })
  } finally {
    isLoading.value = false
  }
}

function getStepFromRoute(r: RouteLocationNormalizedLoadedGeneric): number | null {
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
  if (tabIndex.value === 3) {
    pickFolderStore.refreshUnsupportedFiles().then()
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
      text="Let's set up your library and preferences.
      Make sure your media folders are linked correctly, then choose a user folder to begin."
    />

    <v-stepper
      color="primary"
      v-model="tabIndex"
      class="stepper"
      editable
      :items="['Drives', 'User folder', 'Skipped files', 'Confirm setup']"
    >
      <!-- eslint-disable vue/valid-v-slot -->
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
        <confirm-setup-tab />
      </template>
      <!-- eslint-enable vue/valid-v-slot -->

      <template v-slot:actions="{ prev, next }">
        <div class="bottom-buttons">
          <v-btn
            class="left-button"
            color="primary"
            variant="plain"
            rounded
            @click="prev"
            :disabled="tabIndex <= 1"
            >Back</v-btn
          >
          <v-btn
            class="right-button"
            color="primary"
            variant="tonal"
            rounded
            v-if="tabIndex < 4"
            @click="next"
            >Next</v-btn
          >
          <v-btn
            class="right-button"
            color="primary"
            variant="flat"
            rounded
            v-else
            @click="startProcessing"
            >Start</v-btn
          >
        </div>
      </template>
    </v-stepper>
  </my-main-container>
</template>

<style scoped>
.bottom-buttons {
  display: flex;
  justify-content: space-between;
  padding: 5px;
}
</style>
