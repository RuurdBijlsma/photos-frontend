<script setup lang="ts">
defineProps<{
  date: { date: string; year: string | null } | null
}>()
</script>

<template>
  <div class="date-view" v-if="date">
    <span class="date-view-date">{{ date.date }}</span>
    <span v-if="date.year" class="date-view-year">{{ date.year }}</span>
  </div>
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
  background-color: rgba(var(--v-theme-surface-container-highest), 0.5);
  color: rgba(var(--v-theme-on-surface), 1);
  box-shadow:
    0 4px 8px 0 rgba(0, 0, 0, 0.2),
    0 6px 20px 0 rgba(0, 0, 0, 0.19);
  backdrop-filter: saturate(150%) brightness(70%) blur(20px) contrast(100%);
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
