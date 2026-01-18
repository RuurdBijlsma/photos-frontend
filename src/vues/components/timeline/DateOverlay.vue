<script setup lang="ts">
import { computed } from 'vue'
import { CURRENT_YEAR, DAYS, MONTHS } from '@/scripts/constants.ts'

const props = defineProps<{
  date: Date | null
}>()

const renderedDate = computed(() => {
  const date = props.date
  if (date === null) return { date: null, year: null }

  const day = DAYS[date.getDay()]!
  const month = MONTHS[date.getMonth()]!
  const year = date.getFullYear() === CURRENT_YEAR ? null : ' ' + date.getFullYear()

  return { date: `${day.substring(0, 3)}, ${date.getDate()} ${month.substring(0, 3)}`, year }
})
</script>

<template>
  <v-slide-y-transition>
    <div class="date-view" v-if="date">
      <span class="date-view-date">{{ renderedDate.date }}</span>
      <span v-if="renderedDate.year" class="date-view-year">{{ renderedDate.year }}</span>
    </div>
  </v-slide-y-transition>
</template>

<style scoped>
.date-view {
  position: absolute;
  top: 30px;
  right: 30px;
  padding: 20px 40px;
  z-index: 3;
  text-align: left;
  font-weight: 500;
  border-radius: 40px;
  background-color: rgba(var(--v-theme-surface-container-high), 1);
  color: rgba(var(--v-theme-on-surface-container-high), 1);
  box-shadow:
    0 4px 8px 0 rgba(0, 0, 0, 0.2),
    0 6px 20px 0 rgba(0, 0, 0, 0.19);
}

.date-view-date {
  font-weight: 700;
  font-size: 22px;
  margin-right: 20px;
}

.date-view-year {
  font-weight: 400;
  font-size: 16px;
}
</style>
