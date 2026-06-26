<script setup lang="ts">
import MainLayoutContainer from '@/vues/components/MainLayoutContainer.vue'
</script>

<template>
  <main-layout-container class="settings">
    <div class="settings-content">
      <h1 class="settings-title">Activity</h1>

      <div class="divider-flex">
        <v-divider />
        <span>Temp</span>
        <v-divider />
      </div>
    </div>
  </main-layout-container>
</template>

<style scoped>
.settings {
  overflow-y: auto;
}

.settings-content {
  max-width: 1400px;
  margin: 0 auto;
  padding: 32px 24px;
}

.settings-title {
  font-size: 2.125rem;
  font-weight: 700;
  margin-bottom: 32px;
  color: rgb(var(--v-theme-on-surface));
}

.divider-flex {
  display: flex;
  gap: 30px;
  margin-top: 25px;
  margin-bottom: 25px;
  margin-left: 50px;
  margin-right: 50px;
  align-items: center;
}

.divider-flex span {
  font-size: 25px;
  white-space: nowrap;
  color: rgba(var(--v-theme-on-surface-variant), 0.8);
}
</style>
