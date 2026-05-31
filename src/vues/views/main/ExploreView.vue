<script setup lang="ts">
import MainLayoutContainer from '@/vues/components/MainLayoutContainer.vue'
import { useSunStore } from '@/scripts/stores/sunStore.ts'
import { useDialogStore } from '@/scripts/stores/dialogStore.ts'

const sunStore = useSunStore()
const dialogs = useDialogStore()

async function doSun() {
  await sunStore.fetchSunTimes()
  console.log({
    sunset: sunStore.sunset,
    sunrise: sunStore.sunrise,
  })
  await dialogs.alert(
    `The run will rise at ${sunStore.sunrise?.toLocaleString()}, and it'll set at ${sunStore.sunset?.toLocaleString()}`,
  )
}
</script>

<template>
  <main-layout-container class="explore">
    <h1>Explore!</h1>
    <v-btn @click="doSun()">Sun</v-btn>
  </main-layout-container>
</template>

<style scoped></style>
