<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import type { SearchResultItem } from '@/scripts/types/api/search.ts'
import mediaItemService from '@/scripts/services/mediaItemService.ts'
import { useSnackbarsStore } from '@/scripts/stores/snackbarStore.ts'
import SimpleTimeline from '@/vues/components/simple-timeline/SimpleTimeline.vue'
import { useRoute, useRouter } from 'vue-router'

const snackStore = useSnackbarsStore()
const route = useRoute()
const router = useRouter()

const query = ref('')
const results = ref<SearchResultItem[]>([])
const loading = ref(false)

async function executeSearch() {
  loading.value = true
  if (query.value === '') return
  setQuery().then()
  try {
    const { data } = await mediaItemService.search(query.value, 0.12)
    results.value = data
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
    <div class="search-header">
      <h1>Search</h1>
      <v-form @submit.prevent="executeSearch" class="search-form">
        <v-text-field
          variant="outlined"
          rounded
          placeholder="Search..."
          class="mt-5"
          width="500"
          v-model="query"
        />
        <v-btn
          :disabled="query === ''"
          type="submit"
          color="primary"
          outlined
          rounded
          variant="tonal"
          :loading="loading"
          >Search</v-btn
        >
      </v-form>
    </div>
  </simple-timeline>
</template>

<style scoped>
.search-form {
  display: flex;
  align-items: center;
  gap: 20px;
  width: 600px;
}
</style>
