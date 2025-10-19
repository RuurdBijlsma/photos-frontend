<script setup lang="ts">
import { useTheme } from 'vuetify/framework'

defineProps<{
  folder: string[]
  pill: boolean
  iconColor?: string
  includeSelectedText?: boolean
}>()

const theme = useTheme()
</script>

<template>
  <div class="folder-selection text-lg-caption">
    <v-icon :color="iconColor ?? 'primary'" icon="mdi-check-circle-outline" />
    <span class="primary-color" v-if="includeSelectedText">Selected folder:</span>
    <div
      :style="{
        backgroundColor: pill ? theme.current.value.colors['secondary-container'] : undefined,
      }"
      class="viewed-folder"
    >
      <span class="opa">Media Root</span>
      <template v-for="(component, index) in folder" :key="index">
        <v-icon color="on-secondary-container" icon="mdi-chevron-right" />
        <span>{{ component }}</span>
      </template>
    </div>
  </div>
</template>

<style scoped>
.folder-selection {
  display: flex;
  justify-content: center;
  gap: 10px;
  align-items: center;
}

.primary-color {
  color: rgb(var(--v-theme-primary));
}

.viewed-folder {
  font-weight: 500;
  display: flex;
  align-items: center;
  padding: 5px 20px;
  border-radius: 20px;
  color: rgb(var(--v-theme-on-secondary-container));
}

.opa {
  opacity: 0.7;
  font-weight: bold;
}
</style>
