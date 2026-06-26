<!-- File: src/vues/views/main/ActivityView.vue -->
<script setup lang="ts">
import MainLayoutContainer from '@/vues/components/MainLayoutContainer.vue'
import IngestActivityCard from '@/vues/components/activity/IngestActivityCard.vue'
</script>

<template>
  <main-layout-container class="activity-scroll-view">
    <div class="activity-content">
      <header class="activity-header mb-6">
        <h1 class="activity-title">Library import status</h1>
        <p class="activity-subtitle">
          Monitor your server's metadata extraction, image processing, analysis pipelines, and LLM
          tagging progress.
        </p>
      </header>

      <ingest-activity-card />
    </div>
  </main-layout-container>
</template>

<style scoped>
.activity-scroll-view {
  overflow-y: auto;
}

.activity-content {
  max-width: 1400px;
  margin: 0 auto;
  padding: 32px 24px;
}

.activity-title {
  font-size: 2.125rem;
  font-weight: 700;
  margin-bottom: 6px;
  color: rgb(var(--v-theme-on-surface));
}

.activity-subtitle {
  font-size: 0.95rem;
  color: rgb(var(--v-theme-on-surface-variant));
  margin-bottom: 0;
}
</style>
