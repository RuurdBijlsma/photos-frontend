<script setup lang="ts">
defineProps<{
  text: string
  icon: string
  backgroundColor: string
  textColor: string
}>()
</script>

<template>
  <v-alert variant="flat" :color="backgroundColor" class="server-alert">
    <v-icon :color="textColor" :icon="icon" />
    <p class="text-caption" :style="{ color: textColor }">
      {{ text }}
    </p>
  </v-alert>
</template>

<style scoped>
.server-alert {
  border-radius: 15px;
}

.server-alert:deep(.v-alert__content) {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 20px;
  padding-left: 10px;
}
</style>
