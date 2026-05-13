<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  modelDate: Date
}>()

const date = ref<Date>(new Date())

const menu = ref(false)
// Time update helper for the manual input
function updateTime(type: 'h' | 'm' | 's', val: string) {
  const newDate = new Date(props.modelDate)
  const num = Math.max(0, parseInt(val) || 0)
  if (type === 'h') newDate.setHours(Math.min(23, num))
  if (type === 'm') newDate.setMinutes(Math.min(59, num))
  if (type === 's') newDate.setSeconds(Math.min(59, num))
  // set date? idk
}

const formatDate = (date: Date) => {
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`
}

const formatTime = (date: Date) => {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`
}
</script>

<template>
  <v-menu
    v-model="menu"
    :close-on-content-click="false"
    location="bottom center"
    transition="scale-transition"
  >
    <template v-slot:activator="{ props: menuProps }">
      <div class="display-box adjusted clickable" v-bind="menuProps" v-ripple>
        <span>{{ formatDate(modelDate) }}, {{ formatTime(modelDate) }}</span>
        <v-icon icon="mdi-calendar-edit" size="small" color="primary" class="ml-auto" />
      </div>
    </template>

    <!-- The actual picker content -->
    <v-card color="surface-container-high" elevation="12" rounded="lg" class="pa-2">
      <v-date-picker v-model="date" color="primary" hide-header />

      <v-divider class="mx-4" />

      <div class="pa-4 d-flex align-center justify-center">
        <v-icon icon="mdi-clock-outline" class="mr-3" color="primary" />
        <div class="time-picker-inputs d-flex align-center">
          <input
            class="t-input"
            type="number"
            :value="modelDate.getHours()"
            @input="(e) => updateTime('h', (e.target as HTMLInputElement).value)"
          />
          <span class="mx-1">:</span>
          <input
            class="t-input"
            type="number"
            :value="modelDate.getMinutes()"
            @input="(e) => updateTime('m', (e.target as HTMLInputElement).value)"
          />
          <span class="mx-1">:</span>
          <input
            class="t-input"
            type="number"
            :value="modelDate.getSeconds()"
            @input="(e) => updateTime('s', (e.target as HTMLInputElement).value)"
          />
        </div>
      </div>

      <v-card-actions>
        <v-spacer />
        <v-btn color="primary" variant="text" @click="menu = false">Set Time</v-btn>
      </v-card-actions>
    </v-card>
  </v-menu>
</template>

<style scoped>
.display-box {
  flex-grow: 1;
  padding: 10px 16px;
  border-radius: 10px;
  font-size: 16px;
  display: flex;
  align-items: center;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.1);
}

.adjusted {
  background-color: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  font-family:
    Roboto Mono,
    Menlo,
    Consolas,
    monospace;
}

.clickable {
  cursor: pointer;
  transition: transform 0.1s;
}
.clickable:active {
  transform: scale(0.98);
}

/* Time Input styling for the picker menu */
.t-input {
  width: 40px;
  text-align: center;
  background: rgba(var(--v-theme-on-surface), 0.05);
  border: none;
  border-radius: 4px;
  color: inherit;
  font-family: monospace;
  font-size: 1.1rem;
  padding: 4px;
}

.t-input:focus {
  outline: 2px solid rgb(var(--v-theme-primary));
}

/* Chrome/Safari hide number arrows */
input::-webkit-outer-spin-button,
input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

:deep(.v-date-picker) {
  background-color: transparent !important;
}
</style>
