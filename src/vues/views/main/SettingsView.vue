<script setup lang="ts">
import MainLayoutContainer from '@/vues/components/MainLayoutContainer.vue'
import ThemeSettings from '@/vues/components/settings/ThemeSettings.vue'
</script>

<template>
  <main-layout-container class="settings">
    <div class="settings-content py-8 px-6 max-width-container">
      <h1 class="text-h4 font-weight-bold mb-6 text-on-surface">Settings</h1>
      <theme-settings></theme-settings>

      <!-- Section: Placeholder Other Settings -->
      <div class="mt-8 border-t pt-6">
        <h3 class="text-h6 font-weight-medium text-on-surface-variant mb-2">
          Other Settings Placeholder
        </h3>
        <p class="text-body-2 text-on-surface-variant">Hello world</p>
      </div>
    </div>
  </main-layout-container>
</template>

<style scoped>
.max-width-container {
  max-width: 1400px;
  margin: 0 auto;
}
</style>
