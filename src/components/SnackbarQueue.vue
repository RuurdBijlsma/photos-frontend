<script setup lang="ts">
import { scheme } from '@/plugins/vuetify'
import { useSnackbarsStore } from '@/stores/snackbars'

const snackbars = useSnackbarsStore()
</script>

<template>
  <v-snackbar
    v-for="(snack, index) in snackbars.queue"
    :style="{
      transform: `translateY(-${index * 55}px)`,
    }"
    variant="flat"
    :color="scheme.primary_container"
    rounded="pill"
    class="rounded-xl snackbar"
    :key="snack.id"
    v-model="snack.open"
    :timeout="snack.timeout"
  >
    {{ snack.message }}

    <template v-slot:actions>
      <v-btn
        :color="scheme.on_primary_container"
        variant="text"
        @click="snack.open = false"
      >
        Close
      </v-btn>
    </template>
  </v-snackbar>
</template>

<style scoped>
.snackbar {
  transition: transform 0.5s;
}
</style>
