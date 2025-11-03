<script setup lang="ts">
import type { RowLayout } from '@/components/photo-grid/GridRow.vue'
import { computed } from 'vue'
import { MONTHS } from '@/script/constants.ts'

const props = defineProps<{
  row: RowLayout
}>()
const monthDate = computed(() => new Date(props.row.monthId))
const monthName = computed(() => MONTHS[monthDate.value.getMonth()])
const isCurrentYear = computed(() => monthDate.value.getFullYear() == new Date().getFullYear())
</script>

<template>
  <h1 class="month-title">
    <span class="month">{{ monthName }}</span
    ><template v-if="!isCurrentYear"
      ><span class="year">{{ monthDate.getFullYear() }}</span></template
    >
  </h1>
</template>

<style scoped>
.month-title {
  padding: 12px 0 18px 15px;
  margin-left: 20px;
}

.month {
  font-weight: 700;
  font-size: 24px;
}

.year {
  font-weight: 300;
  font-size: 18px;
  margin-left: 20px;
}
</style>
