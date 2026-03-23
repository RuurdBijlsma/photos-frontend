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

async function executeSearch() {
  if (query.value === '') return
  loading.value = true
  setQuery().then()
  try {
    console.log('Search with params', {
      startDate: startDateParam.value,
      endDate: endDateParam.value,
      countryCode: filterCountry.value,
      negativeQuery: filterNegativeQuery.value === '' ? null : filterNegativeQuery.value,
      faceName: filterPerson.value,
    })
    const { items } = await searchService.search({
      query: query.value,
      limit: 100,
      startDate: startDateParam.value,
      endDate: endDateParam.value,
      countryCode: filterCountry.value,
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

const formatMonthYear = (date: Date) => {
  return date.toLocaleDateString(undefined, { month: 'short', year: 'numeric', timeZone: 'UTC' })
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

const filterDateRange = ref([0, 100])
const filterMediaType = ref<'all' | 'photo' | 'video'>('all')
const filterCountry = ref<string[]>([])
const filterPerson = ref(null)
const filterNegativeQuery = ref(null)
const showFilters = ref(false)

const availableMonths = computed(() => {
  if (!filterRanges.value) return []

  const start = new Date(filterRanges.value.dateStart)
  const end = new Date(filterRanges.value.dateEnd)

  const months: Date[] = []
  const current = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1))
  const last = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1))

  while (current <= last) {
    months.push(new Date(current))
    current.setUTCMonth(current.getUTCMonth() + 1)
  }
  return months
})

watch(
  availableMonths,
  (newMonths) => {
    if (newMonths.length > 0) {
      filterDateRange.value = [0, newMonths.length - 1]
    }
  },
  { immediate: true },
)
const startDateParam = computed(() => {
  if (filterDateRange.value[0] === 0 || availableMonths.value.length === 0) return undefined
  return availableMonths.value[filterDateRange.value[0]!]!.toISOString()
})
const endDateParam = computed(() => {
  const lastIdx = availableMonths.value.length - 1
  if (filterDateRange.value[1] === lastIdx || lastIdx < 0) return undefined
  // To include the whole month, we take the 1st of the NEXT month
  const selectedMonth = availableMonths.value[filterDateRange.value[1]!]!
  const nextMonth = new Date(selectedMonth)
  nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1)
  return nextMonth.toISOString()
})
const debounceSearch = useDebounceFn(executeSearch, 150)
watch(
  [
    filterDateRange,
    filterCountry,
    filterPerson,
    filterMediaType,
    filterNegativeQuery,
    sortDirection,
  ],
  () => {
    debounceSearch()
  },
)
// todo: filters in url query zetten
// todo: is text field is empty, make sure null is sent
// todo: if startdate is earliest point, send null, if enddate is latest point, send null
// todo: clean up UI for date range, its ugly now. If last date range is selected, show
// todo: filterDateRange moet obj zijn, niet een array of 2 items
// todo: backend - support multiple countries
// todo: hij execute search 2x
// todo: haal epilepsie aanval weg als je filter aanpast (misschien pas loading laten zien als t langer dan 500ms duurt, of als er 0 results zijn en loading true is.
// todo: alleen month dots in date slider waar de months ook bestaan in de backend (pas backend aan)
// todo: filter v-menu kan wel blurry bg krijgen, is leuk
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
              <p class="ml-3">
                <span v-if="availableMonths.length">
                  <span class="font-weight-bold">Filter:</span>
                  {{ formatMonthYear(availableMonths[filterDateRange[0]!]!) }}
                  -
                  {{ formatMonthYear(availableMonths[filterDateRange[1]!]!) }}
                </span>
              </p>

              <v-range-slider
                v-if="availableMonths.length > 0"
                class="mt-10 px-4"
                hide-details
                color="primary"
                v-model="filterDateRange"
                :min="0"
                :max="availableMonths.length - 1"
                :step="1"
                strict
                thumb-label="always"
                prepend-icon="mdi-calendar-outline"
              >
                <!-- Custom Thumb Label to show "MMM YYYY" -->
                <template v-slot:thumb-label="{ modelValue }">
                  <div style="white-space: nowrap">
                    {{ formatMonthYear(availableMonths[modelValue]!) }}
                  </div>
                </template>
              </v-range-slider>
              <div class="small-filters">
                <div class="media-type">
                  <p class="mt-5 mb-2">Media type</p>
                  <v-chip-group mandatory v-model="filterMediaType" color="primary">
                    <v-chip value="photo">Photos</v-chip>
                    <v-chip value="video">Videos</v-chip>
                    <v-chip value="all">All</v-chip>
                  </v-chip-group>
                </div>
                <div class="country-code" v-if="filterRanges">
                  <p class="mt-5 mb-2">Country</p>
                  <v-select
                    v-model="filterCountry"
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
                  <p class="mt-5 mb-2">Person</p>
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
                  <p class="mt-5 mb-2">
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
