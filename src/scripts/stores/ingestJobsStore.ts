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
      // Refresh local list states
      await Promise.all([fetchOverview(), fetchFailed()])
    } catch (error) {
      snackbarStore.error(`Failed to retry Ingest Job #${jobId}`, error)
      throw error
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
  }
})
