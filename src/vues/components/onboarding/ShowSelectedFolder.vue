<script setup lang="ts">
defineProps<{
  folder: string[]
  pill: boolean
  iconColor?: string
  includeSelectedText?: boolean
}>()
</script>

<template>
  <div class="folder-selection text-lg-caption">
    <v-icon :color="iconColor ?? 'primary'" icon="mdi-check-circle-outline" />
    <span class="primary-color" v-if="includeSelectedText">Selected folder:</span>
    <div
      :style="{
        backgroundColor: pill ? `rgb(var(--v-theme-secondary-container))` : undefined,
        color: pill ? `rgb(var(--v-theme-on-secondary-container))` : undefined,
        paddingLeft: pill ? '20px' : '0',
      }"
      class="viewed-folder"
    >
      <span class="opa">Root</span>
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
  border-radius: 20px;
  padding-left: 10px;
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
