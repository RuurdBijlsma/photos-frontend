import { ref, type Ref } from 'vue'
import { defineStore } from 'pinia'
import type { IngestOverviewResponse } from '@/scripts/types/api/ingestJobs.ts'
import type { JobInfo } from '@/scripts/types/api/admin.ts'
import { useSnackbarsStore } from '@/scripts/stores/snackbarStore.ts'
import ingestJobsService from '@/scripts/services/ingestJobsService.ts'

export const useIngestJobsStore = defineStore('ingestJobs', () => {
  const snackbarStore = useSnackbarsStore()

  // --- STATE ---
  const overview: Ref<IngestOverviewResponse | null> = ref(null)
  const runningJobs: Ref<JobInfo[]> = ref([])
  const failedJobs: Ref<JobInfo[]> = ref([])

  const isOverviewLoading: Ref<boolean> = ref(false)
  const isRunningLoading: Ref<boolean> = ref(false)
  const isFailedLoading: Ref<boolean> = ref(false)

  // Polling State & Connection Counters
  let pollingIntervalId: ReturnType<typeof setInterval> | null = null
  const activeSubscribers = ref(0)
  const needsFailedScope = ref(0)

  // --- ACTIONS ---

  async function fetchOverview() {
    isOverviewLoading.value = true
    try {
      const response = await ingestJobsService.getOverview()
      overview.value = response.data
    } catch (error) {
      snackbarStore.error('Failed to load ingest job counts', error)
    } finally {
      isOverviewLoading.value = false
    }
  }

  async function fetchRunning() {
    isRunningLoading.value = true
    try {
      const response = await ingestJobsService.getRunning()
      runningJobs.value = response.data
    } catch (error) {
      snackbarStore.error('Failed to load active ingest processes', error)
    } finally {
      isRunningLoading.value = false
    }
  }

  async function fetchFailed() {
    isFailedLoading.value = true
    try {
      const response = await ingestJobsService.getFailed()
      failedJobs.value = response.data
    } catch (error) {
      snackbarStore.error('Failed to load failed ingest processes', error)
    } finally {
      isFailedLoading.value = false
    }
  }

  async function triggerScan() {
    try {
      await ingestJobsService.scan()
      snackbarStore.success('Library folder scan triggered successfully')
    } catch (error) {
      snackbarStore.error('Failed to trigger folder scan', error)
      throw error
    }
  }

  async function retryJob(jobId: number) {
    try {
      await ingestJobsService.retry(jobId)
      snackbarStore.success(`Ingest Job #${jobId} scheduled for retry`)
      await Promise.all([fetchOverview(), fetchFailed()])
    } catch (error) {
      snackbarStore.error(`Failed to retry Ingest Job #${jobId}`, error)
      throw error
    }
  }

  // Orchestrated Tick
  async function pollTick() {
    const promises: Promise<void>[] = [fetchOverview(), fetchRunning()]
    if (needsFailedScope.value > 0) {
      promises.push(fetchFailed())
    }
    await Promise.all(promises)
  }

  // Subscriber Reference-Counting Methods
  function startPolling(includeFailed = false) {
    activeSubscribers.value++
    if (includeFailed) {
      needsFailedScope.value++
    }

    if (activeSubscribers.value === 1) {
      pollTick()
      pollingIntervalId = setInterval(() => {
        pollTick()
      }, 3000)
    } else if (includeFailed && needsFailedScope.value === 1) {
      fetchFailed()
    }
  }

  function stopPolling(includeFailed = false) {
    activeSubscribers.value = Math.max(0, activeSubscribers.value - 1)
    if (includeFailed) {
      needsFailedScope.value = Math.max(0, needsFailedScope.value - 1)
    }

    if (activeSubscribers.value === 0 && pollingIntervalId) {
      clearInterval(pollingIntervalId)
      pollingIntervalId = null
    }
  }

  return {
    // State
    overview,
    runningJobs,
    failedJobs,
    isOverviewLoading,
    isRunningLoading,
    isFailedLoading,
    // Actions
    fetchOverview,
    fetchRunning,
    fetchFailed,
    triggerScan,
    retryJob,
    pollTick,
    startPolling,
    stopPolling,
  }
})
