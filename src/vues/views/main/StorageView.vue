<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import MainLayoutContainer from '@/vues/components/MainLayoutContainer.vue'
import { useSystemStore } from '@/scripts/stores/systemStore.ts'
import { prettyBytes } from '@/scripts/utils.ts'
import storageService from '@/scripts/services/storageService.ts'
import type { StorageSummaryResponse } from '@/scripts/types/generated/timeline.ts'
import { useSnackbarsStore } from '@/scripts/stores/snackbarStore.ts'

const systemStore = useSystemStore()
const snackbarStore = useSnackbarsStore()

const summary = ref<StorageSummaryResponse>({
  largePotentialSavings: 0,
  largeItemCount: 0,
  blurryPotentialSavings: 0,
  blurryItemCount: 0,
  mediaFolderSizeBytes: 0,
  thumbnailFolderSizeBytes: 0,
})
const loading = ref(false)
const diskStats = computed(() => systemStore.stats.disk)
const mediaUsedPercentage = computed(() =>
  percentage(diskStats.value.mediaDrive.diskUsed, diskStats.value.mediaDrive.diskTotal),
)
const thumbnailUsedPercentage = computed(() =>
  percentage(diskStats.value.thumbnailDrive.diskUsed, diskStats.value.thumbnailDrive.diskTotal),
)

const reviewCards = computed(() => [
  {
    title: 'Large photos & videos',
    description: `${summary.value.largeItemCount}${summary.value.largeItemCount >= 250 ? '+' : ''} item${summary.value.largeItemCount === 1 ? '' : 's'} over 10 MB`,
    savings: summary.value.largePotentialSavings,
    icon: 'mdi-image-multiple-outline',
    to: '/storage/review',
  },
  {
    title: 'Blurry photos',
    description: `${summary.value.blurryItemCount} low-quality item${summary.value.blurryItemCount === 1 ? '' : 's'} detected`,
    savings: summary.value.blurryPotentialSavings,
    icon: 'mdi-image-broken-variant',
    to: '/storage/blurry',
  },
])

function percentage(used: number, total: number) {
  if (total <= 0) return 0
  return Math.min(100, Math.max(0, (used / total) * 100))
}

async function loadSummary() {
  loading.value = true
  try {
    const [storageSummary] = await Promise.all([
      storageService.getSummary(),
      systemStore.fetchStats(),
    ])
    console.log(storageSummary)
    summary.value = storageSummary
  } catch (e) {
    snackbarStore.error('Could not load storage summary', e)
  } finally {
    loading.value = false
  }
}

onMounted(loadSummary)
</script>

<template>
  <main-layout-container>
    <div class="storage-page">
      <header class="storage-header">
        <div>
          <h1>Manage storage</h1>
          <p>Review large files and low-quality media before permanently deleting anything.</p>
        </div>
        <v-btn
          variant="text"
          color="primary"
          icon="mdi-refresh"
          :loading="loading"
          v-tooltip:top="'Refresh'"
          @click="loadSummary"
        />
      </header>

      <section class="usage-section">
        <div class="usage-card">
          <div class="usage-card-header">
            <div>
              <h2>{{ diskStats.areSameDrive ? 'Storage usage' : 'Media drive' }}</h2>
              <p>
                {{ prettyBytes(diskStats.mediaDrive.diskUsed, 1) }} of
                {{ prettyBytes(diskStats.mediaDrive.diskTotal, 1) }} used
              </p>
            </div>
            <strong>{{ Math.round(mediaUsedPercentage) }}%</strong>
          </div>
          <v-progress-linear
            :model-value="mediaUsedPercentage"
            color="primary"
            height="14"
            rounded-bar
          />
          <div class="usage-footer">
            <span>{{ prettyBytes(diskStats.mediaDrive.diskAvailable, 1) }} available</span>
            <span>{{ prettyBytes(diskStats.mediaDrive.diskUsed, 1) }} used</span>
          </div>
        </div>

        <div class="usage-card" v-if="!diskStats.areSameDrive">
          <div class="usage-card-header">
            <div>
              <h2>Thumbnail drive</h2>
              <p>
                {{ prettyBytes(diskStats.thumbnailDrive.diskUsed, 1) }} of
                {{ prettyBytes(diskStats.thumbnailDrive.diskTotal, 1) }} used
              </p>
            </div>
            <strong>{{ Math.round(thumbnailUsedPercentage) }}%</strong>
          </div>
          <v-progress-linear
            :model-value="thumbnailUsedPercentage"
            color="primary"
            height="14"
            rounded-bar
          />
          <div class="usage-footer">
            <span>{{ prettyBytes(diskStats.thumbnailDrive.diskAvailable, 1) }} available</span>
            <span>{{ prettyBytes(diskStats.thumbnailDrive.diskUsed, 1) }} used</span>
          </div>
        </div>
      </section>

      <section class="review-section">
        <h2>Review & delete</h2>
        <div class="review-links">
          <router-link v-for="card in reviewCards" :key="card.to" :to="card.to" class="review-card">
            <v-icon :icon="card.icon" size="30" class="review-icon" />
            <div class="review-copy">
              <h3>{{ card.title }}</h3>
              <p>{{ card.description }}</p>
            </div>
            <div class="review-saving">
              <span>Can save</span>
              <strong>{{ prettyBytes(card.savings) }}</strong>
            </div>
            <v-icon icon="mdi-chevron-right" size="28" class="chevron" />
          </router-link>
        </div>
      </section>

      <teleport to="body">
        <router-view />
      </teleport>
    </div>
  </main-layout-container>
</template>

<style scoped>
.storage-page {
  padding: 30px;
}

.storage-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
  margin-bottom: 24px;
}

h1 {
  margin: 0;
  font-size: 2.5rem;
  font-weight: 600;
}

.storage-header p,
.usage-card p,
.review-copy p,
.usage-footer,
.review-saving span {
  color: rgb(var(--v-theme-on-surface-variant));
}

.storage-header p {
  margin: 4px 0 0;
}

.usage-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
  margin-bottom: 34px;
}

.usage-card {
  padding: 20px;
  border-radius: 28px;
  background: rgb(var(--v-theme-surface-container-low));
}

.usage-card :deep(.v-progress-linear) {
  border-radius: 999px;
  overflow: hidden;
}

.usage-card :deep(.v-progress-linear__background) {
  border-radius: 999px;
}

.usage-card-header {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  align-items: flex-start;
  margin-bottom: 16px;
}

.usage-card h2,
.review-section h2 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
}

.usage-card p {
  margin: 4px 0 0;
}

.usage-card strong {
  font-size: 1.6rem;
  font-weight: 600;
}

.usage-footer {
  display: flex;
  justify-content: space-between;
  margin-top: 10px;
  font-size: 0.9rem;
}

.review-section h2 {
  margin-bottom: 12px;
}

.review-links {
  display: grid;
  gap: 12px;
}

.review-card {
  display: grid;
  grid-template-columns: auto 1fr auto auto;
  align-items: center;
  gap: 16px;
  padding: 16px;
  border-radius: 28px;
  color: inherit;
  text-decoration: none;
  background: rgb(var(--v-theme-surface-container-low));
  transition:
    background-color 0.18s ease,
    transform 0.18s ease;
}

.review-card:hover {
  background: rgb(var(--v-theme-surface-container-high));
  transform: translateY(-1px);
}

.review-icon {
  color: rgb(var(--v-theme-primary));
}

.review-copy h3 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
}

.review-copy p {
  margin: 3px 0 0;
}

.review-saving {
  text-align: right;
  display: flex;
  flex-direction: column;
}

.review-saving strong {
  font-size: 1.15rem;
  font-weight: 600;
}

.chevron {
  color: rgb(var(--v-theme-on-surface-variant));
}

@media (max-width: 700px) {
  .storage-page {
    padding: 20px;
  }

  .review-card {
    grid-template-columns: auto 1fr auto;
  }

  .review-saving {
    grid-column: 2 / 3;
    text-align: left;
  }
}
</style>
