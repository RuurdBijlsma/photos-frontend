<script setup lang="ts">
defineProps<{
  color: string
  name: string
  textColor: string
}>()
</script>

<template>
  <v-col cols="12" sm="6" md="4" lg="3">
    <div
      class="pa-4 rounded-lg d-flex align-center justify-space-between"
      :style="{
        backgroundColor: color,
        color: textColor,
        border: '1px solid #ddd',
      }"
    >
      <div>
        <div class="text-body-1">{{ name }}</div>
        <div class="text-caption">{{ color }}</div>
      </div>
    </div>
  </v-col>
</template>

<style scoped></style>
