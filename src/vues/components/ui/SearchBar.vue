<script setup lang="ts">
import { ref, watch, onUnmounted, useTemplateRef, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useDebounceFn } from '@vueuse/core'
import mediaItemService from '@/scripts/services/mediaItemService.ts'
import { useSnackbarsStore } from '@/scripts/stores/snackbarStore.ts'
import type { SimpleTimelineItem } from '@/scripts/types/generated/timeline.ts'
import GridItem from '@/vues/components/timeline/timeline-components/GridItem.vue'

const router = useRouter()
const route = useRoute()
const snackStore = useSnackbarsStore()
const searchInputEl = useTemplateRef('searchInput')
const searchContainer = useTemplateRef('searchContainer')

const query = ref('')
const results = ref<SimpleTimelineItem[]>([])
const suggestions = ref<string[]>([])
const loading = ref(false)
const isFocused = ref(false)
const selectedSuggestionIndex = ref(-1)

let latestRequestId = 0

async function performSearch(searchQuery: string | null) {
  if (!searchQuery?.trim()) {
    results.value = []
    return
  }

  const requestId = ++latestRequestId
  loading.value = true

  try {
    const { items } = await mediaItemService.search(searchQuery, 10)
    if (requestId === latestRequestId) {
      console.log('Search Results:', items)
      results.value = items
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

async function fetchSuggestions(searchQuery: string | null) {
  if (!searchQuery?.trim()) {
    suggestions.value = []
    return
  }

  try {
    const { suggestions: fetchedSuggestions } = await mediaItemService.searchSuggestions(searchQuery, 10)
    suggestions.value = fetchedSuggestions
  } catch (e) {
    console.error('Failed to fetch suggestions', e)
  }
}

function highlightMatch(text: string, match: string | null) {
  if (!match || !text) return text
  const escapedMatch = match.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`(${escapedMatch})`, 'gi')
  return text.replace(regex, '<strong>$1</strong>')
}

function selectSuggestion(suggestion: string) {
  query.value = suggestion
  suggestions.value = []
  isFocused.value = false
  if (searchInputEl.value) {
    searchInputEl.value.blur()
  }
  handleSubmit()
}

const debouncedFetchSuggestions = useDebounceFn((val: string | null) => {
  fetchSuggestions(val)
}, 16)

const debouncedPerformSearch = useDebounceFn((val: string | null) => {
  performSearch(val)
}, 300)

watch(query, (newVal) => {
  selectedSuggestionIndex.value = -1
  debouncedFetchSuggestions(newVal)
  debouncedPerformSearch(newVal)
})

function handleKeyDown(e: KeyboardEvent) {
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    if (selectedSuggestionIndex.value < suggestions.value.length - 1) {
      selectedSuggestionIndex.value++
    }
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    if (selectedSuggestionIndex.value > -1) {
      selectedSuggestionIndex.value--
    }
  } else if (e.key === 'Enter') {
    if (
      selectedSuggestionIndex.value >= 0 &&
      selectedSuggestionIndex.value < suggestions.value.length
    ) {
      e.preventDefault()
      selectSuggestion(suggestions.value[selectedSuggestionIndex.value]!)
    }
  } else if (e.key === 'Escape') {
    isFocused.value = false
    if (searchInputEl.value) {
      searchInputEl.value.blur()
    }
  }
}

function handleSubmit() {
  if (!query.value?.trim()) return
  if (searchInputEl.value) {
    searchInputEl.value.blur()
  }
  router.push({
    path: '/search',
    query: { query: query.value },
  })
}

function handleFocusOut(event: FocusEvent) {
  if (event.relatedTarget && searchContainer.value?.contains(event.relatedTarget as Node)) {
    return
  }
  isFocused.value = false
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

watch(
  () => [route.path, route.query.query],
  () => {
    isFocused.value = false
  },
)

onUnmounted(() => {
  // No manual timer clearing needed with useDebounceFn if we don't store them manually
})
</script>

<template>
  <div class="search-section">
    <div ref="searchContainer" class="search-centered-section" @focusout="handleFocusOut">
      <form @submit.prevent="handleSubmit">
        <label class="search-bar" tabindex="-1" :class="{ 'is-focused': isFocused }">
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
            @click:clear="results = []"
            @keydown="handleKeyDown"
          />
        </label>
      </form>

      <div v-if="isFocused && (query?.length > 0 || suggestions.length > 0)" class="search-suggestions" tabindex="-1">
        <div class="search-suggestions-inner">
          <div v-if="suggestions.length > 0" class="suggestions-list">
            <div
              v-for="(suggestion, index) in suggestions"
              :key="index"
              class="suggestion-item"
              :class="{ 'suggestion-selected': index === selectedSuggestionIndex }"
              @click="selectSuggestion(suggestion)"
              v-html="highlightMatch(suggestion, query)"
            ></div>
          </div>

          <div v-if="loading && results.length === 0 && suggestions.length === 0">
            Searching...
          </div>
          <div v-else-if="results.length === 0 && suggestions.length === 0">No results found.</div>
          <div v-if="results.length > 0" class="search-results-section">
            <div class="results-header">Media</div>
            <div class="search-results">
              <grid-item
                v-for="result in results"
                :key="result.id"
                :media-item="result"
                :width="120 * result.ratio"
                :height="120"
                :thumbnail-size="240"
                :is-scrolling-fast="false"
                class="search-grid-item"
                :view-link="`/search/view/`"
                :query="{ query }"
              />
            </div>
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

.suggestions-list {
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin-bottom: 15px;
}

.suggestion-item {
  padding: 8px 12px;
  cursor: pointer;
  border-radius: 10px;
  transition: background-color 0.2s;
}

.suggestion-item:hover,
.suggestion-item.suggestion-selected {
  background-color: rgba(var(--v-theme-on-surface), 0.1);
}

.suggestion-item :deep(strong) {
  color: rgb(var(--v-theme-primary));
}

.search-results-section {
  margin-top: 10px;
}

.results-header {
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  opacity: 0.6;
  margin-bottom: 8px;
  padding-left: 5px;
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

.search-bar:focus {
  outline: none;
}

.search-centered-section:focus-within .search-bar,
.search-bar.is-focused {
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

.search-grid-item {
  border-radius: 20px;
}
</style>
