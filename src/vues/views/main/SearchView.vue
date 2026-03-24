<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
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
const filterRanges = ref<SearchFilterRanges | null>(
  localStorage.getItem('searchFilterRanges') === null
    ? null
    : JSON.parse(localStorage['searchFilterRanges']),
)
watch(filterRanges, () => (localStorage['searchFilterRanges'] = JSON.stringify(filterRanges.value)))

const filterDateIndices = ref([0, 0])
const filterDateObj = computed(() => ({
  first: filterDateIndices.value[0]!,
  last: filterDateIndices.value[1]!,
}))
function formatMonth(dateStr: string | undefined) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
}

async function executeSearch() {
  if (query.value === '') return
  loading.value = true
  setQuery().then()
  let startDate: string | undefined = undefined
  let endDate: string | undefined = undefined
  if (filterRanges.value && filterRanges.value.availableMonths.length > 0) {
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

  try {
    const { items } = await searchService.search({
      query: query.value,
      limit: 100,
      startDate,
      endDate,
      countryCodes: filterCountries.value.join(','),
      mediaType: filterMediaType.value,
      negativeQuery:
        filterNegativeQuery.value === '' ? undefined : (filterNegativeQuery.value ?? undefined),
      faceName: filterPerson.value ?? undefined,
      sortBy: sortDirection.value,
    })
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

const debounceSearch = useDebounceFn(executeSearch, 100)
watch(
  [
    filterDateIndices,
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
  <simple-timeline :timeline-items="loading ? [] : results" view-link="/search/view/">
    <div class="search-options">
      <h2 class="search-query-title">
        <v-icon class="mr-5 search-query-icon" icon="mdi-magnify" />Search for “<span
          class="search-query-highlight"
          >{{ query }}</span
        >”
      </h2>
      <v-spacer />
      <div class="advanced-search-button mr-5">
        <v-menu v-model="showFilters" :close-on-content-click="false">
          <template v-slot:activator="{ props }">
            <v-btn v-bind="props" variant="text" rounded prepend-icon="mdi-tune-variant">
              Filters
            </v-btn>
          </template>
          <v-card
            variant="tonal"
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
                    <v-chip value="photo">Photos</v-chip>
                    <v-chip value="video">Videos</v-chip>
                    <v-chip value="all">All</v-chip>
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
                    variant="outlined"
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
                    variant="outlined"
                    width="200"
                    rounded
                    hide-details
                    placeholder="Anyone"
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
                    variant="outlined"
                    width="200"
                    rounded
                  />
                </div>
              </div>
            </v-card-text>
          </v-card>
        </v-menu>
      </div>
      <div class="sort-text">Sort:</div>
      <v-btn-toggle v-model="sortDirection" divided rounded="xl" color="primary" variant="tonal">
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
    <div class="loading-indicator" v-if="loading">
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
</style>
