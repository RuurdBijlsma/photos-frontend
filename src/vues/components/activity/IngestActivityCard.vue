<!-- File: src/vues/components/activity/IngestActivityCard.vue -->
<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useIngestJobsStore } from '@/scripts/stores/ingestJobsStore.ts'
import { useIntervalFn } from '@vueuse/core'
import { caps } from '@/scripts/utils.ts'

// todo:
// Extract duplicate code into own component
// Align slight differences between overlay and activity view UI, so it can be extracted properly to own component
// The failed section can go on ActivityView.vue, as well as the Scan folder button

const props = withDefaults(
  defineProps<{
    overlay?: boolean
  }>(),
  {
    overlay: false,
  },
)

const emit = defineEmits<{
  (e: 'close-menu'): void
}>()

const ingestStore = useIngestJobsStore()

const isScanning = ref(false)
const retryingJobIds = ref<Set<number>>(new Set())
const failedExpanded = ref<Record<number, boolean>>({})

// Toggle this flag to show/hide LLM Tagging options
const SHOW_LLM = false

const categories = [
  { key: 'metadata', label: 'File import', icon: 'mdi-file-image-outline' },
  { key: 'thumbnails', label: 'Generate thumbnails', icon: 'mdi-image-outline' },
  { key: 'analysis', label: 'Index for search', icon: 'mdi-search-web' },
  ...(SHOW_LLM ? [{ key: 'llm', label: 'LLM Tagging', icon: 'mdi-brain' }] : []),
] as const
type CatKey = 'metadata' | 'thumbnails' | 'analysis' | 'llm'

// Identifies the current phase of the ingestion process
const activeCategories = computed(() => {
  if (!ingestStore.overview) return new Set<string>()
  // Step 1: Look for any category with actively running processes
  const activeCats = new Set<string>()
  for (const cat of categories) {
    const counts = ingestStore.overview[cat.key as CatKey]
    if (counts && counts.running > 0) {
      activeCats.add(cat.key)
    }
  }
  return activeCats
})

const categoryProgress = computed(() => {
  if (!ingestStore.overview) return []

  return categories.map((cat) => {
    const counts = ingestStore.overview![cat.key as CatKey]
    const total = counts?.total || 0

    if (total === 0) {
      return {
        ...cat,
        total: 0,
        done: 0,
        toGo: 0,
        percentage: 0,
        segments: [],
      }
    }

    const done = counts.done || 0
    const running = counts.running || 0
    const queued = counts.queued || 0
    const failed = counts.failed || 0
    const cancelled = counts.cancelled || 0
    const toGo = queued + running

    const segments = [
      { name: 'done', value: done, colorClass: 'done', label: 'Completed' },
      { name: 'running', value: running, colorClass: 'running', label: 'Running' },
      { name: 'queued', value: queued, colorClass: 'queued', label: 'Queued' },
      { name: 'failed', value: failed, colorClass: 'failed', label: 'Failed' },
      { name: 'cancelled', value: cancelled, colorClass: 'cancelled', label: 'Cancelled' },
    ]
      .filter((s) => s.value > 0)
      .map((s) => ({
        ...s,
        pct: (s.value / total) * 100,
      }))

    const percentage = Math.floor((done / total) * 100)

    return {
      ...cat,
      total,
      done,
      toGo,
      percentage,
      segments,
      counts,
    }
  })
})

// Dynamically filter segments to optimize presentation space in the dropdown overlay
const filteredCategoryProgress = computed(() => {
  const progress = categoryProgress.value
  if (props.overlay && activeCategories.value.size > 0) {
    return progress.filter((cat) => activeCategories.value.has(cat.key))
  }
  return progress
})

const loadData = async () => {
  await Promise.all([
    ingestStore.fetchOverview(),
    ingestStore.fetchRunning(),
    ...(props.overlay ? [] : [ingestStore.fetchFailed()]),
  ])
}

const { pause, resume } = useIntervalFn(
  () => {
    loadData()
  },
  3000,
  { immediate: false },
)

onMounted(() => {
  loadData()
  resume()
})

onUnmounted(() => {
  pause()
})

async function handleScan() {
  isScanning.value = true
  try {
    await ingestStore.triggerScan()
    await loadData()
  } catch {
    // Already handled/reported in Pinia store
  } finally {
    isScanning.value = false
  }
}

async function handleRetry(jobId: number) {
  retryingJobIds.value.add(jobId)
  try {
    await ingestStore.retryJob(jobId)
  } catch {
    // Already handled/reported in Pinia store
  } finally {
    retryingJobIds.value.delete(jobId)
  }
}

function toggleError(jobId: number) {
  failedExpanded.value[jobId] = !failedExpanded.value[jobId]
}
</script>

<template>
  <div :class="[overlay ? 'overlay-container' : 'page-container']">
    <!-- Overlay Layout inside AppBar v-menu -->
    <template v-if="overlay">
      <div class="ingest-card">
        <div class="d-flex align-center justify-space-between mb-4">
          <span class="font-weight-bold text-subtitle-1">Importing photos and videos...</span>
          <v-btn
            icon="mdi-refresh"
            variant="text"
            density="comfortable"
            color="primary"
            @click="loadData"
            :loading="ingestStore.isOverviewLoading || ingestStore.isRunningLoading"
          />
        </div>

        <div class="progress-section">
          <div v-for="cat in filteredCategoryProgress" :key="cat.key" class="category-row">
            <div class="category-header">
              <span class="category-title">
                <v-icon :icon="cat.icon" size="18" color="primary" />
                {{ cat.label }}
              </span>
              <span class="category-stats" v-if="cat.total > 0 && cat.toGo > 0">
                <strong>{{ cat.toGo.toLocaleString() }}</strong> of
                {{ cat.total.toLocaleString() }} to go ({{ cat.percentage }}%)
              </span>
              <span class="category-stats" v-else-if="cat.total > 0">
                <em>No more tasks</em>
              </span>
              <span class="category-stats italic" v-else>No jobs scheduled</span>
            </div>

            <!-- Custom stacked multi-segment progress bar -->
            <div class="progress-track" v-if="cat.total > 0">
              <div
                v-for="seg in cat.segments"
                :key="seg.name"
                :class="['progress-seg', seg.colorClass]"
                :style="{ width: seg.pct + '%' }"
                v-tooltip:top="`${seg.label}: ${seg.value}`"
              />
            </div>

            <div class="legend-flex" v-if="cat.total > 0">
              <div v-for="seg in cat.segments" :key="seg.name" class="legend-item">
                <div :class="['legend-dot', seg.colorClass]" />
                <span>{{ seg.label }} ({{ seg.value.toLocaleString() }})</span>
              </div>
            </div>
          </div>
        </div>

        <div class="running-jobs-section">
          <div class="section-title">
            <v-icon icon="mdi-swap-vertical" color="primary" />
            <span>Currently importing</span>
          </div>

          <div v-if="ingestStore.runningJobs.length > 0">
            <div v-for="job in ingestStore.runningJobs.slice(0, 4)" :key="job.id" class="job-pill">
              <div class="job-info-left">
                <span class="job-type-badge">{{ caps(job.jobType.replace('ingest_', '')) }}</span>
                <span class="job-path" :title="job.relativePath || ''">
                  {{ job.relativePath ? job.relativePath.split('/').pop() : 'System Task' }}
                </span>
              </div>
              <v-progress-circular indeterminate size="16" width="2" color="primary" />
            </div>
            <div
              v-if="ingestStore.runningJobs.length > 4"
              class="text-caption text-center text-medium-emphasis mt-1"
            >
              + {{ ingestStore.runningJobs.length - 4 }} more active tasks
            </div>
          </div>
        </div>

        <div class="mt-4 pt-2">
          <v-btn
            to="/activity"
            color="primary"
            block
            variant="tonal"
            rounded="xl"
            prepend-icon="mdi-arrow-right"
            @click="emit('close-menu')"
          >
            View Full Activity
          </v-btn>
        </div>
      </div>
    </template>

    <!-- Full Page Layout (Fixed inside ActivityView.vue) -->
    <template v-else>
      <div class="left-col">
        <!-- Scan Library Action -->
        <v-card class="action-card mb-6" flat>
          <div class="action-content d-flex align-center justify-space-between pa-6">
            <div>
              <h2 class="text-h6 font-weight-bold mb-1">Index Library Folder</h2>
              <p class="text-body-2 text-medium-emphasis mb-0">
                Initiate a background search of your configured directory to discover new photos and
                videos.
              </p>
            </div>
            <v-btn
              color="primary"
              variant="flat"
              rounded="xl"
              class="px-6 py-3 font-weight-bold"
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

          <div
            v-for="cat in filteredCategoryProgress"
            :key="cat.key"
            :class="[
              'category-row pa-5',
              {
                'active-category': activeCategories.has(cat.key),
                'dimmed-category': activeCategories.size > 0 && !activeCategories.has(cat.key),
              },
            ]"
          >
            <div class="category-header mb-2">
              <span class="category-title text-subtitle-1">
                <v-icon :icon="cat.icon" size="22" color="primary" class="mr-1" />
                {{ cat.label }}
              </span>
              <span class="category-stats text-subtitle-2" v-if="cat.total > 0 && cat.toGo > 0">
                <strong>{{ cat.toGo }}</strong> of {{ cat.total }} to go ({{ cat.percentage }}%)
              </span>
              <span class="category-stats text-subtitle-2" v-else-if="cat.total > 0">
                <em>No more tasks</em>
              </span>
              <span class="category-stats italic text-subtitle-2 text-medium-emphasis" v-else>
                No active/recent jobs found
              </span>
            </div>

            <!-- Enhanced progress track -->
            <div class="progress-track height-large mb-3" v-if="cat.total > 0">
              <div
                v-for="seg in cat.segments"
                :key="seg.name"
                :class="['progress-seg', seg.colorClass]"
                :style="{ width: seg.pct + '%' }"
                v-tooltip:top="`${seg.label}: ${seg.value}`"
              />
            </div>

            <div class="legend-grid" v-if="cat.total > 0">
              <div v-for="seg in cat.segments" :key="seg.name" class="legend-pill">
                <div :class="['legend-dot', seg.colorClass]" />
                <span class="legend-label">
                  {{ seg.label }}: <strong>{{ seg.value }}</strong>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="right-col">
        <!-- Running Tasks (Hidden if pipeline is idle) -->
        <div v-if="ingestStore.runningJobs.length > 0" class="mb-6">
          <h2 class="section-title">
            <v-icon icon="mdi-swap-vertical" color="primary" />
            <span>Currently importing ({{ ingestStore.runningJobs.length }})</span>
          </h2>

          <div>
            <div v-for="job in ingestStore.runningJobs" :key="job.id" class="job-pill pa-4">
              <div class="job-info-left">
                <span class="job-type-badge text-caption mb-1">
                  {{ caps(job.jobType.replace('ingest_', '')) }}
                </span>
                <span class="job-path font-weight-medium" :title="job.relativePath || ''">
                  {{ job.relativePath || 'System Optimization Task' }}
                </span>
              </div>
              <v-progress-circular indeterminate size="20" width="2" color="primary" />
            </div>
          </div>
        </div>

        <!-- Failed Imports / Retries -->
        <div>
          <h2 class="section-title">
            <v-icon icon="mdi-alert-circle-outline" color="error" />
            <span>Failed ({{ ingestStore.failedJobs.length }})</span>
          </h2>

          <div v-if="ingestStore.failedJobs.length > 0" class="failed-list">
            <div v-for="job in ingestStore.failedJobs" :key="job.id" class="failed-pill">
              <div class="failed-main pa-4">
                <div class="job-info-left">
                  <span class="job-type-badge text-caption mb-1 error-text">
                    {{ caps(job.jobType.replace('ingest_', '')) }}
                  </span>
                  <span class="job-path font-weight-medium" :title="job.relativePath || ''">
                    {{ job.relativePath ? job.relativePath.split('/').pop() : 'System Task' }}
                  </span>
                  <span class="text-caption text-medium-emphasis mt-1">
                    Attempts: {{ job.attempts }} / {{ job.maxAttempts }}
                  </span>
                </div>

                <div class="failed-actions d-flex align-center gap-2">
                  <v-btn
                    v-if="job.lastError"
                    :icon="failedExpanded[job.id] ? 'mdi-chevron-up' : 'mdi-chevron-down'"
                    variant="text"
                    color="medium-emphasis"
                    density="comfortable"
                    title="View Error Logs"
                    @click="toggleError(job.id)"
                  />
                  <v-btn
                    variant="tonal"
                    color="primary"
                    size="small"
                    rounded="xl"
                    prepend-icon="mdi-cached"
                    :loading="retryingJobIds.has(job.id)"
                    @click="handleRetry(job.id)"
                  >
                    Retry
                  </v-btn>
                </div>
              </div>

              <!-- Collapsible Error Stack Trace -->
              <v-expand-transition>
                <div
                  v-if="failedExpanded[job.id] && job.lastError"
                  class="error-pre-container pa-4"
                >
                  <div class="text-caption font-weight-bold mb-2">Error Log Trace:</div>
                  <pre class="error-pre">{{ job.lastError }}</pre>
                </div>
              </v-expand-transition>
            </div>
          </div>
          <div v-else class="idle-state py-8">
            <v-icon icon="mdi-emoticon-happy-outline" color="success" size="48" class="mb-2" />
            <h3 class="text-subtitle-1 font-weight-bold">No Failures</h3>
            <p class="idle-text mb-0">No errors registered during recent execution.</p>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.overlay-container {
  width: 420px;
  max-width: 100vw;
  background-color: rgb(var(--v-theme-surface-container-high)) !important;
  border-radius: 24px !important;
  padding: 16px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35) !important;
}

.ingest-card {
  display: flex;
  flex-direction: column;
}

.progress-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.category-row {
  background-color: rgb(var(--v-theme-surface-container-low));
  border-radius: 20px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  border: 2px solid transparent;
  transition: all 0.3s ease;
}

.category-row.active-category {
  border-color: rgb(var(--v-theme-primary));
  background-color: rgba(var(--v-theme-primary), 0.05);
}

.category-row.dimmed-category {
  opacity: 0.55;
}

.category-row.dimmed-category:hover {
  opacity: 0.85;
}

.category-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.category-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  font-size: 0.875rem;
}

.category-stats {
  font-size: 0.8rem;
  color: rgb(var(--v-theme-on-surface-variant));
}

.progress-track {
  display: flex;
  height: 6px;
  background-color: rgb(var(--v-theme-surface-container-highest));
  border-radius: 3px;
  overflow: hidden;
  margin-top: 8px;
  margin-bottom: 4px;
}

.progress-track.height-large {
  height: 10px;
  border-radius: 5px;
}

.progress-seg {
  height: 100%;
  transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.progress-seg.done {
  background-color: rgb(var(--v-theme-success));
}
.progress-seg.running {
  background-color: rgb(var(--v-theme-info));
}
.progress-seg.queued {
  background-color: rgb(var(--v-theme-warning));
}
.progress-seg.failed {
  background-color: rgb(var(--v-theme-error));
}
.progress-seg.cancelled {
  background-color: rgba(var(--v-theme-on-surface), 0.35);
}

.legend-flex {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 6px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.7rem;
  color: rgb(var(--v-theme-on-surface-variant));
}

.legend-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.legend-dot.done {
  background-color: rgb(var(--v-theme-success));
}
.legend-dot.running {
  background-color: rgb(var(--v-theme-info));
}
.legend-dot.queued {
  background-color: rgb(var(--v-theme-warning));
}
.legend-dot.failed {
  background-color: rgb(var(--v-theme-error));
}
.legend-dot.cancelled {
  background-color: rgba(var(--v-theme-on-surface), 0.35);
}

.running-jobs-section {
  margin-top: 16px;
}

.section-title {
  font-size: 1.05rem;
  font-weight: 600;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.job-pill {
  background-color: rgb(var(--v-theme-surface-container-low));
  border-radius: 18px;
  padding: 10px 14px;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.job-info-left {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.job-type-badge {
  font-size: 0.725rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: rgb(var(--v-theme-primary));
}

.job-type-badge.error-text {
  color: rgb(var(--v-theme-error));
}

.job-path {
  font-size: 0.85rem;
  color: rgb(var(--v-theme-on-surface));
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
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

/* Page Layout styles */
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

.legend-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.legend-pill {
  background-color: rgb(var(--v-theme-surface-container-highest));
  padding: 4px 10px;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
}

.legend-label {
  font-size: 0.75rem;
  color: rgb(var(--v-theme-on-surface-variant));
}

.failed-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.failed-pill {
  background-color: rgb(var(--v-theme-surface-container-low));
  border-radius: 20px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.failed-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.error-pre-container {
  background-color: rgba(var(--v-theme-error), 0.05);
  border-top: 1px solid rgba(var(--v-theme-error), 0.1);
}

.error-pre {
  background-color: rgb(var(--v-theme-surface-container-lowest));
  color: rgb(var(--v-theme-error));
  font-family: monospace;
  font-size: 0.775rem;
  padding: 12px;
  border-radius: 12px;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 200px;
}

.gap-2 {
  gap: 8px;
}

.italic {
  font-style: italic;
}
</style>
