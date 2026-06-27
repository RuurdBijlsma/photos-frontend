<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useIngestJobsStore } from '@/scripts/stores/ingestJobsStore.ts'
import IngestPipelineRow from '@/vues/components/activity/IngestPipelineRow.vue'
import RunningJobPill from '@/vues/components/activity/RunningJobPill.vue'
import FailedJobCard from '@/vues/components/activity/FailedJobCard.vue'
import { useAuthStore } from '@/scripts/stores/authStore.ts'

const ingestStore = useIngestJobsStore()
const authStore = useAuthStore()

const isScanning = ref(false)
const retryingJobIds = ref<Set<number>>(new Set())

const categories = [
  { key: 'metadata', label: 'File import', icon: 'mdi-file-image-outline' },
  { key: 'thumbnails', label: 'Generate thumbnails', icon: 'mdi-image-outline' },
  { key: 'analysis', label: 'Index for search', icon: 'mdi-search-web' },
] as const

onMounted(() => {
  // Start polling, demanding failed job collections as well
  ingestStore.startPolling(true)
})

onUnmounted(() => {
  ingestStore.stopPolling(true)
})

const activeCategories = computed(() => {
  if (!ingestStore.overview) return new Set<string>()
  const activeCats = new Set<string>()
  for (const cat of categories) {
    const counts = ingestStore.overview[cat.key]
    if (counts && counts.running > 0) {
      activeCats.add(cat.key)
    }
  }
  return activeCats
})

const categoryProgress = computed(() => {
  if (!ingestStore.overview) return []

  return categories.map((cat) => {
    const counts = ingestStore.overview![cat.key]
    const total = counts?.total || 0
    const done = counts?.done || 0
    const running = counts?.running || 0
    const queued = counts?.queued || 0
    const toGo = queued + running
    const percentage = total > 0 ? Math.floor((done / total) * 100) : 0

    return {
      ...cat,
      total,
      toGo,
      percentage,
      counts,
    }
  })
})

async function handleScan() {
  isScanning.value = true
  try {
    await ingestStore.triggerScan()
  } catch {
    // Pinia store notifies of errors
  } finally {
    isScanning.value = false
  }
}

async function handleRetry(jobId: number) {
  retryingJobIds.value.add(jobId)
  try {
    await ingestStore.retryJob(jobId)
  } catch {
    // Handled in store
  } finally {
    retryingJobIds.value.delete(jobId)
  }
}
</script>

<template>
  <div class="page-container">
    <div class="left-col">
      <!-- Scan Library Action -->
      <v-card class="action-card mb-6" flat>
        <div class="action-content pa-6">
          <div>
            <h2 class="mb-1">Index Library Folder</h2>
            <p class="mb-0">
              Start a search of <pre>{{authStore.user.mediaFolder}}</pre> to discover new photos and
              videos.
            </p>
          </div>
          <v-btn
            color="primary"
            variant="tonal"
            rounded="xl"
            prepend-icon="mdi-folder-search-outline"
            :loading="isScanning"
            @click="handleScan"
          >
            Scan Folder
          </v-btn>
        </div>
      </v-card>

      <!-- Dynamic Category Progress Overviews -->
      <div class="progress-section">
        <h2 class="section-title">
          <v-icon icon="mdi-pipe" color="primary" />
          <span>File Import Pipeline</span>
        </h2>

        <div class="pipeline-list">
          <IngestPipelineRow
            v-for="cat in categoryProgress"
            :key="cat.key"
            v-bind="cat"
            :active="activeCategories.has(cat.key)"
            :dimmed="activeCategories.size > 0 && !activeCategories.has(cat.key)"
          />
        </div>
      </div>
    </div>

    <div class="right-col">
      <!-- Running Tasks -->
      <div v-if="ingestStore.runningJobs.length > 0" class="mb-6">
        <h2 class="section-title">
          <v-icon icon="mdi-swap-vertical" color="primary" />
          <span>Currently importing ({{ ingestStore.runningJobs.length }})</span>
        </h2>

        <div class="running-list">
          <RunningJobPill
            v-for="job in ingestStore.runningJobs"
            :key="job.id"
            :job-type="job.jobType"
            :relative-path="job.relativePath"
          />
        </div>
      </div>

      <!-- Failed Imports / Retries -->
      <div v-if="ingestStore.failedJobs.length > 0">
        <h2 class="section-title">
          <v-icon icon="mdi-alert-circle-outline" color="error" />
          <span>Failed ({{ ingestStore.failedJobs.length }})</span>
        </h2>

        <div class="failed-list">
          <FailedJobCard
            v-for="job in ingestStore.failedJobs"
            :key="job.id"
            v-bind="job"
            :retrying="retryingJobIds.has(job.id)"
            @retry="handleRetry"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-container {
  display: grid;
  grid-template-columns: 1fr;
  gap: 28px;
}

@media (min-width: 960px) {
  .page-container {
    grid-template-columns: 1fr 1fr;
  }
}

.action-card {
  background-color: rgb(var(--v-theme-surface-container-low)) !important;
  border-radius: 24px !important;
}

.action-content{
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap:10px;
}

.progress-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.pipeline-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.section-title {
  font-size: 1.05rem;
  font-weight: 600;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.failed-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.idle-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px 12px;
  text-align: center;
  background-color: rgb(var(--v-theme-surface-container-low));
  border-radius: 20px;
}

.idle-text {
  font-size: 0.85rem;
  color: rgb(var(--v-theme-on-surface-variant));
  margin-top: 6px;
}
</style>
