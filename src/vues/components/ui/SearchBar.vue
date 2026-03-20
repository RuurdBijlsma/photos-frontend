<script setup lang="ts">
import { ref, watch, onUnmounted, useTemplateRef, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import mediaItemService from '@/scripts/services/mediaItemService.ts'
import { useSnackbarsStore } from '@/scripts/stores/snackbarStore.ts'
import type { SimpleTimelineItem } from '@/scripts/types/generated/timeline.ts'
import GridItem from '@/vues/components/timeline/timeline-components/GridItem.vue'

const router = useRouter()
const route = useRoute()
const snackStore = useSnackbarsStore()
const searchInputEl = useTemplateRef('searchInput')

const query = ref('')
const results = ref<SimpleTimelineItem[]>([])
const loading = ref(false)
const isFocused = ref(false)

let debounceTimer: ReturnType<typeof setTimeout> | null = null
let latestRequestId = 0

async function performSearch(searchQuery: string) {
  if (!searchQuery.trim()) {
    results.value = []
    return
  }

  const requestId = ++latestRequestId
  loading.value = true

  try {
    const { items } = await mediaItemService.search(searchQuery, 10)
    if (requestId === latestRequestId) {
      results.value = items
      console.log('Search Results:', results.value)
    }
  } catch (e) {
    if (requestId === latestRequestId) {
      snackStore.error('Search failed', e)
    }
  } finally {
    if (requestId === latestRequestId) {
      loading.value = false
    }
  }
}

watch(query, (newVal) => {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => performSearch(newVal), 300)
})

function handleSubmit() {
  if (!query.value.trim()) return
  if (debounceTimer) clearTimeout(debounceTimer)
  if (searchInputEl.value) {
    searchInputEl.value.blur()
  }
  router.push({
    path: '/search',
    query: { query: query.value },
  })
}

function handleBlur() {
  setTimeout(() => {
    isFocused.value = false
  }, 16)
}

onMounted(() => {
  if (route.query.query) {
    query.value = route.query.query.toString()
  }
})

watch(
  () => route.query.query,
  (newQuery) => {
    if (newQuery && newQuery.toString() !== query.value) {
      query.value = newQuery.toString()
    }
  },
)

onUnmounted(() => {
  if (debounceTimer) clearTimeout(debounceTimer)
})
</script>

<template>
  <div class="search-section">
    <div class="search-centered-section">
      <form @submit.prevent="handleSubmit">
        <label class="search-bar">
          <span class="search-icon-div">
            <v-icon
              class="search-icon"
              :icon="loading ? 'mdi-loading mdi-spin' : 'mdi-magnify'"
            ></v-icon>
          </span>
          <v-text-field
            ref="searchInput"
            v-model="query"
            class="search-text-field"
            placeholder="Search..."
            rounded
            autocomplete="off"
            hide-details
            clearable
            @focus="isFocused = true"
            @blur="handleBlur"
            @click:clear="results = []"
          />
        </label>
      </form>

      <div v-if="isFocused && query.length > 0" class="search-suggestions">
        <div class="search-suggestions-inner">
          <div v-if="loading && results.length === 0">Searching...</div>
          <div v-else-if="results.length === 0">No results found.</div>
          <div v-else class="search-results">
            <grid-item
              v-for="result in results"
              :key="result.id"
              :media-item="result"
              :width="160"
              :height="648 / 5"
              :thumbnail-size="240"
              :is-scrolling-fast="false"
              class="search-grid-item"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.search-section {
  position: fixed;
  top: 7px;
  width: 100%;
}

.search-centered-section {
  width: calc(50% - 100px);
  max-width: 700px;
  margin: 0 auto;
  position: relative;
  flex-grow: 1;
}

.search-suggestions {
  color: rgb(var(--v-theme-on-surface-container-high));
  background-color: rgba(var(--v-theme-surface-container-high), 0.7);
  backdrop-filter: brightness(100%) saturate(250%) blur(50px) contrast(100%) !important;
  top: 25px;
  position: absolute;
  z-index: 5;
  width: 100%;
  padding-top: 25px;
  border-bottom-right-radius: 25px;
  border-bottom-left-radius: 25px;
}

.search-suggestions-inner {
  padding: 15px;
}

.search-bar {
  position: absolute;
  width: 100%;
  cursor: text;
  height: 50px;
  border-radius: 25px;
  background-color: rgba(var(--v-theme-on-background), 0.07);
  display: flex;
  flex-direction: row;
  z-index: 10;
}

.search-bar:has(.search-text-field input:focus) {
  background-color: white;
  color: black;
  box-shadow: 0 2px 2px 0 rgba(0, 0, 0, 0.2);
}

.search-icon-div {
  width: 40px;
  height: 50px;
  display: flex;
  justify-content: flex-end;
  align-items: center;
}

.search-text-field {
  margin-top: -3px;
}

.search-bar:deep(.v-field__overlay) {
  display: none;
}

.search-bar:deep(.v-field__outline) {
  display: none;
}

.mdi-spin {
  animation: mdi-spin 2s infinite linear;
}
@keyframes mdi-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.search-results {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  padding-bottom: 5px;
}

.search-grid-item{
  border-radius:20px;
}
</style>
