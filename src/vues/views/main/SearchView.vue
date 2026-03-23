<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useSnackbarsStore } from '@/scripts/stores/snackbarStore.ts'
import { useRoute, useRouter } from 'vue-router'
import type { SimpleTimelineItem } from '@/scripts/types/generated/timeline.ts'
import SimpleTimeline from '@/vues/components/timeline/simple-timeline/SimpleTimeline.vue'
import MainLayoutContainer from '@/vues/components/MainLayoutContainer.vue'
import searchService from '@/scripts/services/searchService.ts'
import type { SearchFilterRanges } from '@/scripts/types/api/search.ts'

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
  loading.value = true
  if (query.value === '') return
  setQuery().then()
  try {
    const { items } = await searchService.search({
      query: query.value,
      limit: 100,
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

const filterDateRange = ref([20, 40])
const filterMediaType = ref('all')
const filterCountry = ref([])
const filterPerson = ref(null)
watch(filterCountry, () => console.log('filterCountry', filterCountry.value))
watch(filterPerson, () => console.log('filterPerson', filterPerson.value))
const showFilters = ref(false)
</script>

<template>
  <main-layout-container class="search-results-header" v-if="loading">
    <div class="loading-indicator">
      <h2 class="search-summary">
        Searching for "<span class="query-span">{{ query }}</span
        >"...
      </h2>
      <v-progress-circular class="mt-6" :size="70" indeterminate />
    </div>
  </main-layout-container>
  <simple-timeline :timeline-items="results" view-link="/search/view/" v-else>
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
              <p class="ml-3">Date range</p>
              <v-range-slider
                class="mt-6"
                hide-details
                color="primary"
                v-model="filterDateRange"
                thumb-label="always"
                tick-size="4"
                show-ticks="always"
                strict
                prepend-icon="mdi-calendar-outline"
              ></v-range-slider>
              <div class="small-filters">
                <div class="media-type">
                  <p class="mt-5 mb-2">Media type</p>
                  <v-chip-group mandatory v-model="filterMediaType" color="primary">
                    <v-chip value="hi">Photos</v-chip>
                    <v-chip value="asd">Videos</v-chip>
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
                    v-model="filterPerson"
                    :items="['Any', ...filterRanges.people]"
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
</style>
