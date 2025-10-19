<script setup lang="ts">
import { ref } from 'vue'
import { type Snack, useSnackbarsStore } from '@/stores/snackbarStore.ts'

const snackbarsStore = useSnackbarsStore()

const dialog = ref(false)
const selectedSnack = ref<Snack | null>(null)

const snackColor = (snack: Snack) => snack.color ?? 'surface'

const showErrorDetails = (snack: Snack) => {
  snackbarsStore.pauseTimeout(snack.id)
  selectedSnack.value = snack
  dialog.value = true
}
</script>

<template>
  <div class="snackbar-container">
    <transition-group name="snack-fade" tag="div" class="snack-stack">
      <v-snackbar
        v-for="(snack, i) in snackbarsStore.queue"
        :key="snack.id"
        v-model="snack.open"
        :timeout="snack.timeout"
        :color="snackColor(snack)"
        multi-line
        location="bottom"
        rounded="pill"
        class="stacked-snackbar"
        :style="{ bottom: `${i * 75}px` }"
      >
        {{ snack.message }}

        <template #actions>
          <v-btn
            v-if="snack.error"
            :color="'on-' + snackColor(snack)"
            variant="text"
            icon="mdi-information-outline"
            @click="showErrorDetails(snack)"
          >
          </v-btn>
          <v-btn
            :color="'on-' + snackColor(snack)"
            variant="text"
            @click="snack.open = false"
            icon="mdi-close"
          >
          </v-btn>
        </template>
      </v-snackbar>
    </transition-group>

    <v-dialog v-model="dialog" max-width="700">
      <v-card v-if="selectedSnack && selectedSnack.error" color="surface-variant">
        <v-card-title class="headline"
          >Error: <strong>{{ selectedSnack.error.name }}</strong></v-card-title
        >
        <v-card-text>
          <p><strong>Message:</strong> {{ selectedSnack.error.message }}</p>
          <pre v-if="selectedSnack.error.stack"><strong>Stack Trace:</strong>
            {{ selectedSnack.error.stack }}</pre>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="on-surface-variant" text @click="dialog = false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<style scoped>
.snackbar-container {
  position: fixed;
  top: 20px;
  left: 0;
  width: 100%;
  display: flex;
  justify-content: center;
  pointer-events: none;
  z-index: 2000;
}

.snack-stack {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

/* Animations */
.snack-fade-enter-active,
.snack-fade-leave-active {
  transition: all 0.3s ease;
}

.snack-fade-enter-from {
  opacity: 0;
  transform: translateY(-20px);
}

.snack-fade-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}
</style>
