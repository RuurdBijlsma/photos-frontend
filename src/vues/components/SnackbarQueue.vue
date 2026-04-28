<script setup lang="ts">
import { ref } from 'vue'
import { type Snack, useSnackbarsStore } from '@/scripts/stores/snackbarStore'

const store = useSnackbarsStore()

// For the Error Details Modal
const dialog = ref(false)
const selectedSnack = ref<Snack | null>(null)

const showErrorDetails = (snack: Snack) => {
  store.pauseTimeout(snack.id)
  selectedSnack.value = snack
  dialog.value = true
}

// Handle Custom Actions
const handleAction = async (snack: Snack) => {
  store.pauseTimeout(snack.id)
  if (snack.action?.onClick) {
    await snack.action.onClick()
  }
  if (snack.action?.hideOnClick === undefined || snack.action?.hideOnClick === true) {
    store.remove(snack.id)
  }
}

const onMouseEnter = (id: string) => store.pauseTimeout(id)
const onMouseLeave = (id: string) => store.resumeTimeout(id)
</script>

<template>
  <TransitionGroup name="snack" tag="div" class="snackbar-queue-container">
    <div
      v-for="snack in store.snackQueue"
      :key="snack.id"
      class="snack-wrapper"
      @mouseenter="onMouseEnter(snack.id)"
      @mouseleave="onMouseLeave(snack.id)"
    >
      <v-snackbar
        :color="snack.color"
        :prepend-icon="snack.icon"
        :text="snack.message"
        variant="tonal"
        contained
        :timeout="-1"
        rounded="xl"
        :model-value="true"
      >
        <template v-slot:actions>
          <v-btn
            v-if="snack.error || snack.errorData"
            icon="mdi-information-outline"
            variant="text"
            density="comfortable"
            @click.stop="showErrorDetails(snack)"
          />
          <v-btn
            v-if="snack.action"
            :text="snack.action.label"
            @click.stop="handleAction(snack)"
            density="comfortable"
            rounded="lg"
            variant="tonal"
          />
          <v-btn
            icon="mdi-close"
            variant="text"
            density="comfortable"
            @click.stop="store.remove(snack.id)"
          />
        </template>
      </v-snackbar>
    </div>
  </TransitionGroup>

  <!-- Detailed Error Dialog -->
  <v-dialog v-model="dialog" max-width="700">
    <v-card v-if="selectedSnack && selectedSnack.error">
      <v-toolbar color="error" density="compact">
        <v-toolbar-title class="text-subtitle-1">
          {{ selectedSnack.error.name || 'Error Details' }}
        </v-toolbar-title>
        <v-spacer />
        <v-btn icon="mdi-close" @click="dialog = false" />
      </v-toolbar>

      <v-card-text class="pt-4">
        <v-alert v-if="selectedSnack.errorData?.error" type="warning" variant="tonal" class="mb-4">
          <strong>Server Message:</strong> {{ selectedSnack.errorData.error }}
        </v-alert>

        <p class="mb-2"><strong>Message:</strong> {{ selectedSnack.error.message }}</p>

        <v-expansion-panels v-if="selectedSnack.error.stack">
          <v-expansion-panel>
            <v-expansion-panel-title>Stack Trace</v-expansion-panel-title>
            <v-expansion-panel-text>
              <div class="stack-trace bg-grey-lighten-4 pa-2 text-caption">
                {{ selectedSnack.error.stack }}
              </div>
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn color="primary" @click="dialog = false">Close</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
/*
  Container: Fixed at bottom-center.
  Pointer events none allows clicking through the empty space
*/
.snackbar-queue-container {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 2000;
  pointer-events: none; /* Let clicks pass through empty areas */
  width: auto;
  display: flex;
  flex-direction: column-reverse; /* Stacks items from bottom to top */
  gap: 8px;
  align-items: center;
}

.snack-wrapper {
  pointer-events: auto; /* Re-enable clicks on the specific cards */
  transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
  width: 100%;
  display: flex;
  justify-content: center;
}

/*
  Override Vuetify's absolute positioning for contained snackbars.
  This allows them to flow naturally in the flex container.
*/
.snack-wrapper :deep(.v-snackbar) {
  position: relative !important;
  display: flex !important;
  top: auto !important;
  bottom: auto !important;
  left: auto !important;
  right: auto !important;
  transform: none !important;
  width: auto !important;
  margin: 0 !important;
}

.snack-wrapper :deep(.v-snackbar__wrapper) {
  position: relative !important;
  top: auto !important;
  left: auto !important;
  right: auto !important;
  bottom: auto !important;
  transform: none !important;
  margin: 0 !important;
  min-width: 344px;
  max-width: 672px;
}

.stack-trace {
  font-family: monospace;
  white-space: pre-wrap;
  overflow-x: auto;
  max-height: 200px;
}
</style>
