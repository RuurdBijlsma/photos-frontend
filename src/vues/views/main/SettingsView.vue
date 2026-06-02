<script setup lang="ts">
import MainLayoutContainer from '@/vues/components/MainLayoutContainer.vue'
import ThemeSettings from '@/vues/components/settings/ThemeSettings.vue'
</script>

<template>
  <main-layout-container class="settings">
    <div class="settings-content">
      <h1 class="settings-title">Settings</h1>
      <theme-settings></theme-settings>

      <!-- Section: Placeholder Other Settings -->
      <section class="placeholder-section">
        <h3 class="placeholder-title">Other Settings Placeholder</h3>
        <p class="placeholder-desc">Hello world</p>
      </section>
    </div>
  </main-layout-container>
</template>

<style scoped>
.settings-content {
  max-width: 1400px;
  margin: 0 auto;
  padding: 32px 24px;
}

.settings-title {
  font-size: 2.125rem;
  font-weight: 700;
  margin-bottom: 24px;
  color: rgb(var(--v-theme-on-surface));
}

.placeholder-section {
  margin-top: 32px;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  padding-top: 24px;
}

.placeholder-title {
  font-size: 1.25rem;
  font-weight: 500;
  color: rgb(var(--v-theme-on-surface-variant));
  margin-bottom: 8px;
}

.placeholder-desc {
  font-size: 0.875rem;
  color: rgb(var(--v-theme-on-surface-variant));
}
</style>
