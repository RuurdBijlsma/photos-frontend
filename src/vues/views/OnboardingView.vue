<script setup lang="ts">
import { ref, watch } from 'vue'
import { type RouteLocationNormalizedLoadedGeneric, useRoute, useRouter } from 'vue-router'
import CheckDrivesTab from '@/vues/onboarding/CheckDrivesTab.vue'
import PickFolderTab from '@/vues/onboarding/PickFolderTab.vue'
import SkippedFilesTab from '@/vues/onboarding/SkippedFilesTab.vue'
import { usePickFolderStore } from '@/scripts/stores/pickFolderStore.ts'
import ConfirmOnboardingTab from '@/vues/onboarding/ConfirmOnboardingTab.vue'
import { useOnboardingStore } from '@/scripts/stores/onboardingStore.ts'
import FocusLayout from '@/vues/layouts/FocusLayout.vue'
import OnboardingLayout from '@/vues/layouts/OnboardingLayout.vue'

const router = useRouter()
const route = useRoute()
const onboardingStore = useOnboardingStore()
const pickFolderStore = usePickFolderStore()
const isLoading = ref(false)

async function startProcessing() {
  isLoading.value = true
  try {
    await onboardingStore.startProcessing()
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
  <focus-layout>
    <onboarding-layout
      :caption-text="false"
      text="Let's set up your library and preferences.
      Make sure your media folders are linked correctly, then choose a user folder to begin."
    />

    <v-stepper
      color="primary"
      v-model="tabIndex"
      class="stepper"
      editable
      :items="['Drives', 'User folder', 'Skipped files', 'Confirm']"
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
        <confirm-onboarding-tab />
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
  </focus-layout>
</template>

<style scoped>
.bottom-buttons {
  display: flex;
  justify-content: space-between;
  padding: 5px;
}
</style>
