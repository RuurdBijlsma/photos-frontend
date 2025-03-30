<script setup lang="ts">
defineProps<{
  folder: string[]
}>()
</script>

<template>

  <div class="folder-selection text-lg-caption">
    <span>Selected folder:</span>
    <v-icon icon="mdi-folder-outline" />
    <span class="viewed-folder">{{
        folder.join('/') || '/'
      }}</span>
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
  font-family: Arial, Helvetica, Roboto, sans-serif;
  font-weight: 600;
}
</style>
