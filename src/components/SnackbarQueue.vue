<script setup lang="ts">
import { useSnackbarsStore } from '@/stores/snackbarStore.ts'

const snackbarsStore = useSnackbarsStore()

// The v-model="snack.open" is crucial. When Vuetify closes the snackbar
// (either by timeout or the user clicking 'Close'), it will set `snack.open`
// to false. This will trigger the `watch` effect you built in your
// `snackbarsStore` to remove it from the queue.
</script>

<template>
  <div class="snackbar-container">
    <v-snackbar
      v-for="(snack, i) in snackbarsStore.queue"
      :key="snack.id"
      v-model="snack.open"
      :timeout="snack.timeout"
      location="bottom right"
      multi-line
    >
      {{ snack.message }}

      <template #actions>
        <v-btn color="pink" variant="text" @click="snack.open = false"> Close </v-btn>
      </template>
    </v-snackbar>
  </div>
</template>

<style scoped>
.snackbar-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
</style>
