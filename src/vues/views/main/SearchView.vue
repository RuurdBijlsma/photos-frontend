<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import mediaItemService from '@/scripts/services/mediaItemService.ts'
import { useSnackbarsStore } from '@/scripts/stores/snackbarStore.ts'
import { useRoute, useRouter } from 'vue-router'
import type { SimpleTimelineItem } from '@/scripts/types/generated/timeline.ts'
import SimpleTimeline from '@/vues/components/timeline/simple-timeline/SimpleTimeline.vue'

const snackStore = useSnackbarsStore()
const route = useRoute()
const router = useRouter()

const query = ref('')
const results = ref<SimpleTimelineItem[]>([])
const loading = ref(false)

async function executeSearch() {
  loading.value = true
  if (query.value === '') return
  setQuery().then()
  try {
    const { items } = await mediaItemService.search(query.value)
    results.value = items
  } catch (e) {
    snackStore.error('Could not perform search', e)
  } finally {
    loading.value = false
  }
}

async function setQuery() {
  await router.push({ query: { query: query.value } })
}

watch(
  () => route.query.query,
  () => {
    if (query.value !== route.query.query && route.query.query) {
      query.value = route.query.query.toString()
      executeSearch()
    }
  },
)

onMounted(async () => {
  const routeQuery = route.query.query
  if (!routeQuery) return
  query.value = routeQuery.toString()
  await executeSearch()
})
</script>

<template>
  <simple-timeline :timeline-items="results" view-link="/search/view/">
    <div class="search-results-header">
      <h2 class="search-summary">
        {{ results.length }} result{{ results.length === 1 ? '' : 's' }} found for "<span
          class="query-span"
          >{{ query }}</span
        >"
      </h2>
    </div>
  </simple-timeline>
</template>

<style scoped>
.search-results-header {
  padding: 20px 40px 30px;
  text-align: center;
}

.search-summary {
  font-weight: 400;
}

.query-span {
  font-style: italic;
  color: rgb(var(--v-theme-on-surface-bright));
  font-weight: 600;
}
</style>
