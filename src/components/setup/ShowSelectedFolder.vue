<script setup lang="ts">
import { scheme } from '@/plugins/vuetify'

defineProps<{
  folder: string[]
  pill: boolean
  color?: string
  iconColor?: string
  includeSelectedText?: boolean
}>()
</script>

<template>
  <div class="folder-selection text-lg-caption">
    <v-icon :color="iconColor ?? scheme.primary" icon="mdi-check-circle-outline" />
    <span v-if="includeSelectedText" :style="{ color: color ?? scheme.primary }">Selected folder:</span>
    <div
      :style="{
        color: color ?? scheme.on_secondary_container,
        backgroundColor: pill ? scheme.secondary_container : undefined,
      }"
      class="viewed-folder"
    >
      <span class="opa">Media Root</span>
      <template v-for="(component, index) in folder" :key="index">
        <v-icon
          :color="color ?? scheme.on_secondary_container"
          icon="mdi-chevron-right"
        />
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

.viewed-folder {
  font-weight: 500;
  display: flex;
  align-items: center;
  padding: 5px 20px;
  border-radius: 20px;
}

.opa {
  opacity: 0.7;
  font-weight: bold;
}
</style>
