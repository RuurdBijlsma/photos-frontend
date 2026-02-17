<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import type { SearchResultItem } from '@/scripts/types/api/search.ts'
import mediaItemService from '@/scripts/services/mediaItemService.ts'
import { useSnackbarsStore } from '@/scripts/stores/snackbarStore.ts'
import { useRoute, useRouter } from 'vue-router'
import MainLayoutContainer from '@/vues/components/MainLayoutContainer.vue'

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
    const { data } = await mediaItemService.search(query.value)
    data.sort((a, b) => b.combinedScore - a.combinedScore)
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

async function openImg(id: string) {
  window.open(mediaItemService.getPhotoThumbnail(id, 1440, false))
}

async function showDetails(id: string) {
  const { data } = await mediaItemService.getMediaItem(id)
  console.log(id, data)
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
  <main-layout-container>
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
    <div class="photo-grid">
      <div
        v-for="res in results"
        :key="res.id"
        class="photo-item"
        @click.left="openImg(res.id)"
        @click.right="showDetails(res.id)"
      >
        <div
          class="photo"
          :style="{
            backgroundImage: `url(${mediaItemService.getPhotoThumbnail(res.id, 720, false)})`,
          }"
        ></div>
        <div class="info">
          <div class="info-progress" v-tooltip:top="`FTS: ${res.ftsScore}`">
            <span>FTS: #{{ res.ftsRank }}</span>
            <v-progress-linear
              :model-value="Math.round(res.ftsScore * 100)"
              :height="10"
              rounded
              color="blue"
            />
          </div>
          <div class="info-progress" v-tooltip:top="`Vector: ${res.vectorScore}`">
            <span>VEC: #{{ res.vectorRank }}</span>
            <v-progress-linear
              :model-value="Math.round(res.vectorScore * 100)"
              :height="10"
              rounded
              color="purple"
            />
          </div>
          <div class="info-progress" v-tooltip:top="`Combined: ${res.combinedScore}`">
            <span>CBD</span>
            <v-progress-linear
              :model-value="Math.round(res.combinedScore * 100)"
              :height="10"
              :max="3"
              rounded
              color="green"
            />
          </div>
        </div>
      </div>
    </div>
  </main-layout-container>
</template>

<style scoped>
.search-form {
  display: flex;
  align-items: center;
  gap: 20px;
  width: 600px;
}

.photo-grid {
}
.photo-item {
  display: inline-block;
  margin: 5px;
  height: 300px;
  width: 400px;
  border-radius: 10px;
  overflow: hidden;
}

.photo {
  background-size: contain;
  background-position: center;
  background-color: rgba(255, 255, 255, 0.1);
  width: 100%;
  height: calc(100% - 70px);
}

.info {
  margin-top: 10px;
  color: white;
  height: 70px;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.info-progress {
  display: flex;
  gap: 10px;
  font-size: 10px;
}
.info-progress span {
  display: block;
  width: 60px;
  text-align: center;
}
</style>
