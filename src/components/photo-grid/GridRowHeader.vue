<script setup lang="ts">
import type { RowLayout } from '@/components/photo-grid/GridRow.vue'

defineProps<{
  row: RowLayout
}>()
</script>

<template>
  <h1 class="month-title">{{ row.monthId }}</h1>
</template>

<style scoped>
.month-title {
  padding: 20px 0 20px 15px;
  margin-left: 20px;
}
</style>
