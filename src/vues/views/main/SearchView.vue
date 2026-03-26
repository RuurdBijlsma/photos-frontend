<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useSnackbarsStore } from '@/scripts/stores/snackbarStore.ts'
import { useRoute, useRouter } from 'vue-router'
import type { SimpleTimelineItem } from '@/scripts/types/generated/timeline.ts'
import SimpleTimeline from '@/vues/components/timeline/simple-timeline/SimpleTimeline.vue'
import searchService from '@/scripts/services/searchService.ts'
import type { SearchFilterRanges } from '@/scripts/types/api/search.ts'
import { useDebounceFn } from '@vueuse/core'

const snackStore = useSnackbarsStore()
const route = useRoute()
const router = useRouter()

const query = ref('')
const results = ref<SimpleTimelineItem[]>([])
const loading = ref(false)
const showLoadingUI = ref(false)
let loadingTimer: ReturnType<typeof setTimeout> | null = null
const searchCache = new Map<string, SimpleTimelineItem[]>()
const filterRanges = ref<SearchFilterRanges | null>(
  localStorage.getItem('searchFilterRanges') === null
    ? null
    : JSON.parse(localStorage['searchFilterRanges']),
)
watch(filterRanges, () => (localStorage['searchFilterRanges'] = JSON.stringify(filterRanges.value)))

const filterDateIndices = ref([-1, -1])
const filterDateObj = computed(() => ({
  first: filterDateIndices.value[0]!,
  last: filterDateIndices.value[1]!,
}))
function formatMonth(dateStr: string | undefined) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
}
const filterDateRange = computed(() => {
  let startDate: string | undefined = undefined
  let endDate: string | undefined = undefined
  if (
    filterRanges.value &&
    filterRanges.value.availableMonths.length > 0 &&
    filterDateObj.value.first !== -1
  ) {
    const months = filterRanges.value.availableMonths
    if (filterDateObj.value.first !== 0) {
      startDate = new Date(months[filterDateObj.value.first]!).toISOString()
    }
    if (filterDateObj.value.last !== months.length - 1) {
      const date = new Date(months[filterDateObj.value.last]!)
      date.setMonth(date.getMonth() + 1)
      date.setMilliseconds(-1)
      endDate = date.toISOString()
    }
  }
  return { start: startDate, end: endDate }
})

async function executeSearch() {
  if (query.value === '') return
  if (loadingTimer) clearTimeout(loadingTimer)
  loading.value = true
  if (results.value.length === 0) {
    showLoadingUI.value = true
  } else {
    loadingTimer = setTimeout(() => {
      showLoadingUI.value = true
    }, 300)
  }
  setQuery().then()

  try {
    const searchParams = {
      query: query.value,
      limit: 100,
      startDate: filterDateRange.value.start,
      endDate: filterDateRange.value.end,
      countryCodes: filterCountries.value.join(','),
      mediaType: filterMediaType.value,
      negativeQuery:
        filterNegativeQuery.value === '' ? undefined : (filterNegativeQuery.value ?? undefined),
      faceName: filterPerson.value ?? undefined,
      sortBy: sortDirection.value,
    }
    const key = JSON.stringify(searchParams)
    if (searchCache.has(key)) {
      results.value = searchCache.get(key)!
    } else {
      const { items } = await searchService.search(searchParams)
      results.value = items
      console.log('Full search result', items)
      requestIdleCallback(() => {
        searchCache.set(key, items)
      })
    }
  } catch (e) {
    snackStore.error('Could not perform search', e)
  } finally {
    if (loadingTimer) clearTimeout(loadingTimer)
    loading.value = false
    showLoadingUI.value = false
  }
}

async function setQuery() {
  await router.push({ query: { query: query.value } })
}

function clearFilters() {
  filterCountries.value = []
  filterPerson.value = null
  filterNegativeQuery.value = null
  if (filterRanges.value) {
    filterDateIndices.value = [0, filterRanges.value.availableMonths.length - 1]
  } else {
    filterDateIndices.value = [-1, -1]
  }
  filterMediaType.value = 'all'
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

  try {
    const { data } = await searchService.filterRanges()
    filterRanges.value = data
    if (data.availableMonths.length > 0) {
      filterDateIndices.value = [0, data.availableMonths.length - 1]
    }
    console.log('filterRanges', data)
  } catch (e) {
    console.warn("Couldn't fetch filter ranges", e)
  }
})
onUnmounted(() => {
  if (loadingTimer) clearTimeout(loadingTimer)
})

const sortDirection = ref<'date' | 'relevancy'>(
  localStorage.getItem('searchSortDirection') === null
    ? 'relevancy'
    : JSON.parse(localStorage['searchSortDirection']),
)
watch(
  sortDirection,
  () => (localStorage['searchSortDirection'] = JSON.stringify(sortDirection.value)),
)

const filterMediaType = ref<'all' | 'photo' | 'video'>('all')
const filterCountries = ref<string[]>([])
const filterPerson = ref(null)
const filterNegativeQuery = ref(null)
const showFilters = ref(false)

const hasFilters = computed(() => {
  return (
    filterCountries.value.length > 0 ||
    filterPerson.value !== null ||
    filterNegativeQuery.value ||
    filterDateRange.value.start !== undefined ||
    filterDateRange.value.end !== undefined ||
    filterMediaType.value !== 'all'
  )
})

const debounceSearch = useDebounceFn(executeSearch, 100)
watch(
  [
    filterDateRange,
    filterCountries,
    filterPerson,
    filterMediaType,
    filterNegativeQuery,
    sortDirection,
  ],
  () => {
    debounceSearch()
  },
)
</script>

<template>
  <simple-timeline :timeline-items="showLoadingUI ? [] : results" view-link="/search/view/">
    <div class="search-options">
      <h2 class="search-query-title">
        <v-icon class="mr-5 search-query-icon" icon="mdi-magnify" />Search for “<span
          class="search-query-highlight"
          >{{ query }}</span
        >”
      </h2>
      <v-spacer />
      <div class="advanced-search-button">
        <v-menu
          v-model="showFilters"
          :close-on-content-click="false"
          content-class="search-filter-menu"
        >
          <template v-slot:activator="{ props }">
            <v-btn v-bind="props" variant="text" rounded prepend-icon="mdi-tune-variant">
              Filters
            </v-btn>
          </template>
          <v-card
            variant="flat"
            rounded="xl"
            class="search-filters"
            :loading="filterRanges === null"
          >
            <v-card-text>
              <div
                class="date-range-filter px-4 py-2"
                v-if="filterRanges && filterRanges.availableMonths.length > 0"
              >
                <p class="mb-2 font-weight-medium">Date Range</p>
                <div class="d-flex justify-space-between text-caption opacity-70 mb-1">
                  <span>{{ formatMonth(filterRanges.availableMonths[filterDateObj.first]) }}</span>
                  <span>{{ formatMonth(filterRanges.availableMonths[filterDateObj.last]) }}</span>
                </div>
                <v-range-slider
                  v-model="filterDateIndices"
                  :max="filterRanges.availableMonths.length - 1"
                  :min="0"
                  :step="1"
                  hide-details
                  color="primary"
                  strict
                ></v-range-slider>
              </div>

              <v-divider class="mt-3 ml-3 mr-3" />

              <div class="small-filters">
                <div class="media-type">
                  <p class="mt-5 mb-2 font-weight-medium">Media type</p>
                  <v-chip-group mandatory v-model="filterMediaType" color="primary">
                    <v-chip value="all">All</v-chip>
                    <v-chip value="photo">Photos</v-chip>
                    <v-chip value="video">Videos</v-chip>
                  </v-chip-group>
                </div>
                <div class="country-code" v-if="filterRanges">
                  <p class="mt-5 mb-2 font-weight-medium">Country</p>
                  <v-select
                    v-model="filterCountries"
                    :items="
                      filterRanges.countries.map((c) => ({
                        code: c[0],
                        name: c[1],
                      }))
                    "
                    item-title="name"
                    item-value="code"
                    variant="solo"
                    density="comfortable"
                    width="250"
                    rounded
                    hide-details
                    multiple
                    chips
                    closable-chips
                    placeholder="Any country"
                  >
                    <template #item="{ props, item }">
                      <v-list-item v-bind="props" :title="undefined">
                        <template #prepend>
                          <img
                            v-if="item.raw.code"
                            :src="`https://purecatamphetamine.github.io/country-flag-icons/3x2/${item.raw.code}.svg`"
                            width="20"
                            height="15"
                            style="object-fit: cover"
                            :alt="'Flag of ' + item.raw.name"
                          />
                        </template>
                        <v-list-item-title class="ml-3">
                          {{ item.raw.name }}
                        </v-list-item-title>
                      </v-list-item>
                    </template>
                  </v-select>
                </div>
                <div class="person-name" v-if="filterRanges && filterRanges.people.length > 0">
                  <p class="mt-5 mb-2 font-weight-medium">Person</p>
                  <v-select
                    width="200"
                    rounded
                    hide-details
                    placeholder="Anyone"
                    variant="solo"
                    density="comfortable"
                    v-model="filterPerson"
                    :items="filterRanges.people"
                  ></v-select>
                </div>
                <div class="negative-query">
                  <p class="mt-5 mb-2 font-weight-medium">
                    Exclude
                    <v-icon
                      size="16"
                      icon="mdi-information-outline"
                      class="ml-2"
                      v-tooltip="{
                        location: 'top',
                        text: 'Remove results matching these terms (e.g. “cat” + exclude “orange” → non-orange cats)',
                      }"
                    ></v-icon>
                  </p>
                  <v-text-field
                    v-model="filterNegativeQuery"
                    hide-details
                    placeholder="E.g. “orange”"
                    variant="solo"
                    density="comfortable"
                    width="200"
                    rounded
                  />
                </div>
              </div>
            </v-card-text>
          </v-card>
        </v-menu>
        <v-btn
          icon="mdi-close"
          variant="plain"
          @click="clearFilters"
          class="clear-filters-button"
          density="comfortable"
          v-tooltip="{
            location: 'top',
            text: 'Clear filters',
          }"
          :style="{
            pointerEvents: hasFilters ? 'auto' : 'none',
            opacity: hasFilters ? '.6' : '0',
          }"
        ></v-btn>
      </div>
      <div class="sort-text">Sort:</div>
      <v-btn-toggle
        v-model="sortDirection"
        divided
        rounded="xl"
        color="primary"
        variant="tonal"
        mandatory
      >
        <v-btn value="date">
          <span>Date</span>
          <v-icon end icon="mdi-sort-calendar-ascending"></v-icon>
        </v-btn>

        <v-btn value="relevancy">
          <span>Relevancy</span>
          <v-icon end icon="mdi-sort-descending"></v-icon>
        </v-btn>
      </v-btn-toggle>
    </div>
    <div class="search-margin"></div>
    <div class="loading-indicator" v-if="showLoadingUI">
      <h2 class="search-summary">
        Searching for "<span class="query-span">{{ query }}</span
        >"...
      </h2>
      <v-progress-circular class="mt-6" :size="70" indeterminate />
    </div>
  </simple-timeline>
</template>

<style scoped>
.search-summary {
  font-weight: 400;
}

.query-span {
  font-style: italic;
  color: rgb(var(--v-theme-on-surface-bright));
  font-weight: 600;
}

.search-options {
  padding: 15px 20px;
  padding-bottom:13px;
  border-radius: 10px;
  display: flex;
  align-items: center;
}

.search-query-title {
  font-weight: 400;
}

.search-query-icon {
  opacity: 0.5;
  font-size: 30px;
}

.search-query-highlight {
  color: rgb(var(--v-theme-primary));
  font-weight: 600;
}

.sort-text {
  font-weight: 500;
  padding: 0 20px;
  font-size: 18px;
  opacity: 0.7;
}

.search-filters {
  max-width: 1000px;
}

.search-filter-menu .search-filters {
  border: 1px solid rgba(255, 255, 255, 0.1);
  background-color: rgba(var(--v-theme-surface-container-low), 0.95);
}

.backdrop-blur .search-filter-menu .search-filters {
  background-color: rgba(var(--v-theme-surface-container-low), 0.8) !important;
  backdrop-filter: blur(12px) saturate(180%);
  -webkit-backdrop-filter: blur(12px) saturate(180%);
}

.small-filters {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
}

.small-filters > div {
  padding: 10px;
}

.search-margin {
  height: 10px;
}

.loading-indicator {
  padding: 20px 40px 30px;
  text-align: center;
}

.clear-filters-button {
  transition: opacity 0.15s;
}
</style>
