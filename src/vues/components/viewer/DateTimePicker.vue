<script setup lang="ts">
import { computed, ref } from 'vue'

const props = defineProps<{
  modelValue: Date
}>()

const emit = defineEmits(['update:modelValue'])

const dateMenu = ref(false)
const timeMenu = ref(false)

// Formatting for Button Labels (European 24h)
const dateLabel = computed(() => {
  return props.modelValue.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
})

const timeLabel = computed(() => {
  return props.modelValue.toLocaleTimeString('en-GB', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
})
</script>

<template>
  <div class="datetime-input-wrapper">
    <!-- DATE BUTTON & MENU -->
    <v-menu v-model="dateMenu" :close-on-content-click="false" location="bottom center">
      <template v-slot:activator="{ props: menuProps }">
        <v-btn v-bind="menuProps" variant="text" density="compact" rounded="xl">
          {{ dateLabel }}
        </v-btn>
      </template>
      <v-date-picker hide-header />
    </v-menu>

    <!-- TIME BUTTON & MENU -->
    <v-menu v-model="timeMenu" :close-on-content-click="false" location="bottom center">
      <template v-slot:activator="{ props: menuProps }">
        <v-btn v-bind="menuProps" variant="text" density="compact" rounded="xl">
          {{ timeLabel }}
        </v-btn>
      </template>
      <v-time-picker format="24hr" flat full-width />
    </v-menu>
    <v-icon icon="mdi-calendar-edit" size="small" color="primary" class="ml-2" />
  </div>
</template>

<style scoped>
/* The outer rectangle UI box */
.datetime-input-wrapper {
  background-color: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  font-family: 'Roboto Mono', monospace;

  flex-grow: 1;
  padding: 10px 16px;
  border-radius: 10px;
  font-size: 16px;
  display: flex;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.1);
  align-items: center;
}
</style>
