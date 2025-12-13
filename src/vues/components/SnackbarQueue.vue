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
  if (snack.action?.onClick) {
    await snack.action.onClick()
  }
  store.remove(snack.id)
}

const onMouseEnter = (id: string) => store.pauseTimeout(id)
const onMouseLeave = (id: string) => store.resumeTimeout(id)
</script>

<template>
  <div class="snackbar-queue-container">
    <transition-group name="snack" tag="div" class="snack-list">
      <div
        v-for="snack in store.queue"
        :key="snack.id"
        class="snack-wrapper"
        @mouseenter="onMouseEnter(snack.id)"
        @mouseleave="onMouseLeave(snack.id)"
      >
        <!--
          We use v-card styled as a snackbar.
          elevation-6 gives it that pop-out look.
        -->
        <v-card
          :style="{
            backgroundColor: `rgba(var(--v-theme-${snack.color || 'primary'}), 0.9) !important`
          }"
          :color="snack.color"
          class="d-flex align-center py-2 pl-4 pr-2 snack-card"
          elevation="6"
          rounded="pill"
          min-width="300"
          max-width="600"
        >
          <!-- Message Content -->
          <span class="text-body-2 font-weight-medium mr-auto">
            {{ snack.message }}
          </span>

          <!-- Actions Area -->
          <div class="d-flex align-center ml-4">
            <!-- Custom Action Button -->
            <v-btn
              v-if="snack.action"
              variant="text"
              size="small"
              class="rounded-pill"
              @click="handleAction(snack)"
            >
              {{ snack.action.label }}
            </v-btn>

            <!-- Error Details Button -->
            <v-btn
              v-if="snack.error"
              icon="mdi-information-outline"
              variant="text"
              size="small"
              density="comfortable"
              class="ml-1"
              @click="showErrorDetails(snack)"
            />

            <!-- Close Button -->
            <v-btn
              icon="mdi-close"
              variant="text"
              size="small"
              density="comfortable"
              class="ml-1"
              @click="store.remove(snack.id)"
            />
          </div>
        </v-card>
      </div>
    </transition-group>

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
          <v-alert
            v-if="selectedSnack.errorData?.error"
            type="warning"
            variant="tonal"
            class="mb-4"
          >
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
  </div>
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
  flex-direction: column;
  align-items: center;
}

.snack-list {
  display: flex;
  flex-direction: column; /* Newest at bottom. Use column-reverse for newest at top */
  gap: 8px;
  align-items: center;
}

.snack-wrapper {
  pointer-events: auto; /* Re-enable clicks on the specific cards */
  transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
}

/* Ensure text doesn't overflow weirdly */
.snack-card {
  backdrop-filter: blur(5px);
  /* If you want the exact Vuetify snackbar look of old, use specific greys,
     but using theme colors (success/error/info) is usually better UX */
}

/*
  Animations
  v-move is required for smooth reordering when an item is removed from the middle
*/
.snack-enter-from {
  opacity: 0;
  transform: translateY(20px) scale(0.9);
}

.snack-leave-to {
  opacity: 0;
  transform: translateY(-20px) scale(0.95);
}

.snack-move {
  transition: transform 0.4s ease;
}

.stack-trace {
  font-family: monospace;
  white-space: pre-wrap;
  overflow-x: auto;
  max-height: 200px;
}
</style>
