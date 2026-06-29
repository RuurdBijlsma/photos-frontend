import { ref, type Ref } from 'vue'
import { defineStore } from 'pinia'
import type { IngestOverviewResponse } from '@/scripts/types/api/ingestJobs.ts'
import type { JobInfo } from '@/scripts/types/api/admin.ts'
import { useSnackbarsStore } from '@/scripts/stores/snackbarStore.ts'
import ingestJobsService from '@/scripts/services/ingestJobsService.ts'

interface DisplayJob extends JobInfo {
  status?: string
  finished_at?: string | null
  finishedAt?: string | null
  color: string
  _localFinishedAt?: number
}

const stringToColour = (str: string) => {
  let hash = 0
  str.split('').forEach((char) => {
    hash = char.charCodeAt(0) + ((hash << 5) - hash)
  })
  let colour = '#'
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xff
    colour += value.toString(16).padStart(2, '0')
  }
  return colour
}

export const useIngestJobsStore = defineStore('ingestJobs', () => {
  const snackbarStore = useSnackbarsStore()

  // --- CONFIGURATION ---
  const MAX_DISPLAY_ITEMS = 30 // Caps the displayed list size

  // --- STATE ---
  const overview: Ref<IngestOverviewResponse | null> = ref(null)
  const runningJobs: Ref<DisplayJob[]> = ref([])
  const failedJobs: Ref<JobInfo[]> = ref([])

  const isOverviewLoading: Ref<boolean> = ref(false)
  const isRunningLoading: Ref<boolean> = ref(false)
  const isFailedLoading: Ref<boolean> = ref(false)

  // Polling State & Connection Counters
  let pollingIntervalId: ReturnType<typeof setInterval> | null = null
  const activeSubscribers = ref(0)
  const needsFailedScope = ref(0)

  // Dynamic Flow Accumulator State [1]
  const trickleQueue: Ref<DisplayJob[]> = ref([])
  const targetRate = ref(0) // Target flow rate in jobs per millisecond [1]
  const accumulator = ref(0) // Accumulates fractional jobs over time [1]
  let lastTickTime = Date.now() // Tracks absolute timestamp of last loop cycle [1]
  let trickleIntervalId: ReturnType<typeof setInterval> | null = null

  // --- PRIVATE UTILS ---

  function getFinishedTimeMs(job: DisplayJob): number {
    const finishedStr = job.finished_at || job.finishedAt
    if (finishedStr) {
      const parsed = Date.parse(finishedStr)
      if (!isNaN(parsed)) return parsed
    }
    return job._localFinishedAt || Date.now()
  }

  function processIncomingJobs(incomingJobs: DisplayJob[]) {
    const incomingMap = new Map<number, DisplayJob>()
    for (const job of incomingJobs) {
      incomingMap.set(job.id, job)
    }

    // 1. Update status/timestamps on items already being shown in the list
    runningJobs.value = runningJobs.value.map((existingJob) => {
      const incoming = incomingMap.get(existingJob.id)
      if (incoming) {
        const becameDone = existingJob.status !== 'done' && incoming.status === 'done'
        const updated = { ...existingJob, ...incoming }
        if (becameDone && !updated._localFinishedAt) {
          updated._localFinishedAt = Date.now()
        }
        return updated
      } else {
        // Fallback safety: transition jobs that disappeared during polling gaps to 'done'
        if (existingJob.status === 'running') {
          return {
            ...existingJob,
            status: 'done',
            _localFinishedAt: Date.now(),
          }
        }
        return existingJob
      }
    })

    // 2. Identify brand-new items that are not in the list or already waiting in the trickle queue
    const existingIds = new Set(runningJobs.value.map((j) => j.id))
    const queuedIds = new Set(trickleQueue.value.map((j) => j.id))

    const newJobs = incomingJobs.filter((job) => !existingIds.has(job.id) && !queuedIds.has(job.id))

    if (newJobs.length > 0) {
      for (const job of newJobs) {
        if (job.status === 'done' && !job._localFinishedAt) {
          job._localFinishedAt = Date.now()
        }
      }
      trickleQueue.value.push(...newJobs)
    }

    // 3. Recalculate dynamic flow rate to spread the entire queue over the 3-second (3000ms) window [1]
    if (trickleQueue.value.length > 0) {
      targetRate.value = trickleQueue.value.length / 3000
    } else {
      targetRate.value = 0
      accumulator.value = 0
    }
  }

  function tickTrickleAndCleanup() {
    const now = Date.now()
    const dt = now - lastTickTime // Exact elapsed time in milliseconds [1]
    lastTickTime = now

    // 1. Accumulate fractional items based on elapsed time and release completed integers [1]
    if (trickleQueue.value.length > 0 && targetRate.value > 0) {
      accumulator.value += dt * targetRate.value
      const itemsToAdd = Math.floor(accumulator.value)

      if (itemsToAdd > 0) {
        accumulator.value -= itemsToAdd // Subtract only the integer portion [1]

        for (let i = 0; i < itemsToAdd; i++) {
          const nextJob = trickleQueue.value.shift()
          if (nextJob) {
            runningJobs.value.unshift(nextJob)
          }
        }
      }
    } else {
      accumulator.value = 0
      targetRate.value = 0
    }

    // 2. Cleanup age-out: Remove completed items older than 5 seconds
    runningJobs.value = runningJobs.value.filter((job) => {
      if (job.status !== 'done') {
        return true
      }
      const ageMs = now - getFinishedTimeMs(job)
      return ageMs <= 5000
    })

    // 3. Performance safety cap: Drop oldest completed items if list gets too long
    if (runningJobs.value.length > MAX_DISPLAY_ITEMS) {
      const excessCount = runningJobs.value.length - MAX_DISPLAY_ITEMS

      const completedItems = runningJobs.value
        .map((job, idx) => ({ job, idx, finishedTime: getFinishedTimeMs(job) }))
        .filter((item) => item.job.status === 'done')
        .sort((a, b) => a.finishedTime - b.finishedTime)

      if (completedItems.length > 0) {
        const removeIds = new Set(completedItems.slice(0, excessCount).map((item) => item.job.id))
        runningJobs.value = runningJobs.value.filter((job) => !removeIds.has(job.id))
      }
    }
  }

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
      processIncomingJobs(response.data as DisplayJob[])
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

  async function pollTick() {
    const promises: Promise<void>[] = [fetchOverview(), fetchRunning()]
    if (needsFailedScope.value > 0) {
      promises.push(fetchFailed())
    }
    await Promise.all(promises)
  }

  function startPolling(includeFailed = false) {
    activeSubscribers.value++
    if (includeFailed) {
      needsFailedScope.value++
    }

    if (activeSubscribers.value === 1) {
      // Initialize the timestamp tracker to current time to prevent massive dt jump on startup [1]
      lastTickTime = Date.now()

      pollTick()
      pollingIntervalId = setInterval(() => {
        pollTick()
      }, 3000)

      // Start the fluid 50ms (20 FPS) trickle/cleanup loop [1]
      if (!trickleIntervalId) {
        trickleIntervalId = setInterval(() => {
          tickTrickleAndCleanup()
        }, 50)
      }
    } else if (includeFailed && needsFailedScope.value === 1) {
      fetchFailed()
    }
  }

  function stopPolling(includeFailed = false) {
    activeSubscribers.value = Math.max(0, activeSubscribers.value - 1)
    if (includeFailed) {
      needsFailedScope.value = Math.max(0, needsFailedScope.value - 1)
    }

    if (activeSubscribers.value === 0) {
      if (pollingIntervalId) {
        clearInterval(pollingIntervalId)
        pollingIntervalId = null
      }
      if (trickleIntervalId) {
        clearInterval(trickleIntervalId)
        trickleIntervalId = null
      }
    }
  }

  return {
    overview,
    runningJobs,
    failedJobs,
    isOverviewLoading,
    isRunningLoading,
    isFailedLoading,
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
