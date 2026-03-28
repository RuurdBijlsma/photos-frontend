<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useSnackbarsStore } from '@/scripts/stores/snackbarStore.ts'
import { useRoute, useRouter } from 'vue-router'
import type { SimpleTimelineItem } from '@/scripts/types/generated/timeline.ts'
import SimpleTimeline from '@/vues/components/timeline/simple-timeline/SimpleTimeline.vue'
import searchService from '@/scripts/services/searchService.ts'
import type { SearchFilterRanges } from '@/scripts/types/api/search.ts'
import { useDebounceFn } from '@vueuse/core'
import { MONTHS } from '@/scripts/constants.ts'
import mediaItemService from '@/scripts/services/mediaItemService.ts'

const snackStore = useSnackbarsStore()
const route = useRoute()
const router = useRouter()

const results = ref<SimpleTimelineItem[]>([])
const loading = ref(false)
const showLoadingUI = ref(false)
let loadingTimer: ReturnType<typeof setTimeout> | null = null
const searchCache = new Map<string, SimpleTimelineItem[]>()
const defaultSortDirection: 'date' | 'relevancy' = 'relevancy'

const filterRanges = ref<SearchFilterRanges | null>(
  localStorage.getItem('searchFilterRanges') === null
    ? null
    : JSON.parse(localStorage['searchFilterRanges']),
)
watch(filterRanges, () => (localStorage['searchFilterRanges'] = JSON.stringify(filterRanges.value)))
const showFilters = ref(false)

// URL Source of Truth
const query = computed(() => (route.query.query as string) || '')
const filterMediaType = computed({
  get: () => (route.query.type as 'all' | 'photo' | 'video') || 'all',
  set: (val) => updateURL({ type: val === 'all' ? undefined : val }),
})
const filterPeople = computed({
  get: () => (route.query.people ? (route.query.people as string).split(',') : []),
  set: (val) => updateURL({ people: val?.length ? val.join(',') : undefined }),
})
const filterNegativeQuery = computed({
  get: () => (route.query.exclude as string) || null,
  set: (val) => updateURL({ exclude: val || undefined }),
})
const filterCountries = computed({
  get: () => (route.query.countries ? (route.query.countries as string).split(',') : []),
  set: (val) => updateURL({ countries: val?.length ? val.join(',') : undefined }),
})
const sortDirection = computed({
  get: () => (route.query.sort as 'date' | 'relevancy') || defaultSortDirection,
  set: (val) => updateURL({ sort: val === defaultSortDirection ? undefined : val }),
})

// Date Range Helpers
function urlParamToISO(param: string | undefined, endOfMonth = false): string | undefined {
  if (!param) return undefined
  const monthStr = param.substring(0, 3).toLowerCase()
  const year = parseInt(param.substring(3))
  const monthIndex = MONTHS.findIndex((m) => m.toLowerCase().startsWith(monthStr))
  if (monthIndex === -1) return undefined
  const date = new Date(Date.UTC(year, monthIndex, 1))
  if (endOfMonth) {
    date.setUTCMonth(date.getUTCMonth() + 1)
    date.setUTCMilliseconds(-1)
  }
  return date.toISOString()
}

function isoToUrlParam(iso: string | undefined): string | undefined {
  if (!iso) return undefined
  const date = new Date(iso)
  return MONTHS[date.getUTCMonth()]!.substring(0, 3).toLowerCase() + date.getUTCFullYear()
}

const filterDateRange = computed(() => ({
  start: urlParamToISO(route.query.start as string),
  end: urlParamToISO(route.query.end as string, true),
}))

// Slider state management (local because it depends on filterRanges)
const filterDateIndices = ref([0, 0])
let ignoreSliderWatch = false
watch(
  [filterRanges, () => route.query.start, () => route.query.end],
  () => {
    if (!filterRanges.value) return
    const months = filterRanges.value.availableMonths
    if (months.length === 0) return

    let startIdx = 0
    let endIdx = months.length - 1

    if (route.query.start) {
      const iso = urlParamToISO(route.query.start as string)
      const datePart = iso?.substring(0, 10)
      const found = months.findIndex((m) => m.startsWith(datePart!))
      if (found !== -1) startIdx = found
    }
    if (route.query.end) {
      const iso = urlParamToISO(route.query.end as string)
      const datePart = iso?.substring(0, 10)
      const found = months.findIndex((m) => m.startsWith(datePart!))
      if (found !== -1) endIdx = found
    }
    ignoreSliderWatch = true
    filterDateIndices.value = [startIdx, endIdx]
    nextTick(() => (ignoreSliderWatch = false))
  },
  { immediate: true },
)

watch(filterDateIndices, (newVal) => {
  if (ignoreSliderWatch || !filterRanges.value) return
  const [start = 0, end = 0] = newVal
  const months = filterRanges.value.availableMonths
  updateURL({
    start: start === 0 ? undefined : isoToUrlParam(months[start!]),
    end: end === months.length - 1 ? undefined : isoToUrlParam(months[end!]),
  })
})

function formatMonth(dateStr: string | undefined) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}

function formatMonthShort(dateStr: string | undefined) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
}

const dateRangeText = computed(() => {
  if (!filterRanges.value || filterRanges.value.availableMonths.length === 0) return ''
  const months = filterRanges.value.availableMonths
  const [startIdx, endIdx] = filterDateIndices.value
  const isFirst = startIdx === 0
  const isLast = endIdx === months.length - 1

  if (isFirst && isLast) return 'All dates'

  const startMonth = formatMonth(months[startIdx!])
  const endMonth = formatMonth(months[endIdx!])

  if (isFirst) return `Captured up to ${endMonth}`
  if (isLast) return `Captured from ${startMonth}`
  return `Captured between ${startMonth} and ${endMonth}`
})

const debouncedPush = useDebounceFn((query: Record<string, string>) => {
  router.push({ query })
}, 100)

const updateURL = (newParams: Record<string, string | undefined>) => {
  const currentQuery = { ...route.query }
  const nextQuery = { ...currentQuery, ...newParams }

  // Clean up undefined/null/empty/default values
  Object.keys(nextQuery).forEach((key) => {
    if (
      nextQuery[key] === undefined ||
      nextQuery[key] === null ||
      nextQuery[key] === '' ||
      (key === 'type' && nextQuery[key] === 'all') ||
      (key === 'sort' && nextQuery[key] === defaultSortDirection)
    ) {
      delete nextQuery[key]
    }
  })

  // Only push if something actually changed
  if (JSON.stringify(currentQuery) !== JSON.stringify(nextQuery)) {
    debouncedPush(nextQuery as Record<string, string>)
  }
}

async function executeSearch() {
  if (query.value === '') {
    results.value = []
    return
  }
  if (loadingTimer) clearTimeout(loadingTimer)
  loading.value = true
  if (results.value.length === 0) showLoadingUI.value = true
  else loadingTimer = setTimeout(() => (showLoadingUI.value = true), 300)

  try {
    const searchParams = {
      query: query.value,
      limit: 100,
      startDate: filterDateRange.value.start,
      endDate: filterDateRange.value.end,
      countryCodes: filterCountries.value.join(','),
      mediaType: filterMediaType.value as 'all' | 'photo' | 'video',
      negativeQuery: filterNegativeQuery.value || undefined,
      faceNames: filterPeople.value.join(','),
      sortBy: sortDirection.value as 'date' | 'relevancy',
    }
    const key = JSON.stringify(searchParams)
    if (searchCache.has(key)) {
      results.value = searchCache.get(key)!
    } else {
      const { items } = await searchService.search(searchParams)
      results.value = items
      requestIdleCallback(() => searchCache.set(key, items))
    }
  } catch (e) {
    snackStore.error('Could not perform search', e)
  } finally {
    if (loadingTimer) clearTimeout(loadingTimer)
    loading.value = false
    showLoadingUI.value = false
  }
}

function clearFilters() {
  router.push({ query: { query: query.value } })
}

async function fetchFilterRanges() {
  try {
    const { data } = await searchService.filterRanges()
    console.log('FilterRanges', data)
    filterRanges.value = data
  } catch (e) {
    console.warn("Couldn't fetch filter ranges", e)
  }
}

onMounted(async () => {
  // Execute search immediately from URL state
  if (query.value) {
    executeSearch()
  }

  // Fetch ranges in parallel or after, doesn't block search
  fetchFilterRanges()
})

onUnmounted(() => {
  if (loadingTimer) clearTimeout(loadingTimer)
})

const hasFilters = computed(() => {
  return (
    filterCountries.value.length > 0 ||
    filterPeople.value.length > 0 ||
    filterNegativeQuery.value ||
    route.query.start !== undefined ||
    route.query.end !== undefined ||
    filterMediaType.value !== 'all'
  )
})

const activeFilterChips = computed(() => {
  const chips: {
    id: string
    type: string
    label: string
    clear: () => void
    tooltip?: string
    countries?: { code: string; name: string }[]
  }[] = []

  // Date Range
  if (route.query.start || route.query.end) {
    const start = route.query.start
      ? formatMonthShort(urlParamToISO(route.query.start as string))
      : null
    const end = route.query.end
      ? formatMonthShort(urlParamToISO(route.query.end as string, true))
      : null
    let label = ''
    if (start && end) label = `Date: ${start} - ${end}`
    else if (start) label = `From ${start}`
    else if (end) label = `Until ${end}`

    chips.push({
      id: 'date',
      type: 'Date range',
      label,
      clear: () => {
        filterDateIndices.value = [
          0,
          filterRanges.value?.availableMonths.length
            ? filterRanges.value.availableMonths.length - 1
            : 0,
        ]
      },
    })
  }

  // Media Type
  if (filterMediaType.value !== 'all') {
    chips.push({
      id: 'mediaType',
      type: 'Media type',
      label: filterMediaType.value === 'photo' ? 'Photos' : 'Videos',
      clear: () => (filterMediaType.value = 'all'),
    })
  }

  // People
  if (filterPeople.value.length > 0) {
    chips.push({
      id: 'people',
      type: 'People',
      label: filterPeople.value.join(', ').replace(/, ([^,]*)$/, ' or $1'),
      clear: () => (filterPeople.value = []),
    })
  }

  // Countries
  if (filterCountries.value.length > 0 && filterRanges.value) {
    const countries = filterCountries.value.map((code) => {
      const country = filterRanges.value?.countries.find((c) => c[0] === code)
      return { code, name: (country ? country[1] : null) ?? code }
    })

    chips.push({
      id: 'countries',
      type: 'Countries',
      tooltip: countries
        .map((c) => c.name)
        .join(', ')
        .replace(/, ([^,]*)$/, ' or $1'),
      label: '',
      countries: countries,
      clear: () => (filterCountries.value = []),
    })
  }

  // Exclude
  if (filterNegativeQuery.value) {
    chips.push({
      id: 'exclude',
      type: 'Exclude',
      label: `Exclude: "${filterNegativeQuery.value}"`,
      clear: () => (filterNegativeQuery.value = null),
    })
  }

  return chips
})

// Watch route query to re-execute search
watch(() => route.query, executeSearch)
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
        <div class="active-filters-chips mr-2">
          <v-chip
            v-for="chip in activeFilterChips"
            :key="chip.id"
            closable
            size="small"
            @click:close="chip.clear"
            variant="tonal"
            v-tooltip="{
              location: 'top',
              text: chip.tooltip || chip.type,
            }"
          >
            <template v-if="chip.countries" #prepend>
              <img
                v-for="(country, index) in chip.countries"
                :key="country.code"
                :src="`https://purecatamphetamine.github.io/country-flag-icons/3x2/${country.code}.svg`"
                width="20"
                height="15"
                style="object-fit: cover; border-radius: 2px"
                :style="{
                  marginRight: index === chip.countries.length - 1 && !chip.label ? '0' : '4px',
                }"
                :alt="'Flag of ' + country.name"
              />
            </template>
            {{ chip.label }}
          </v-chip>
        </div>
        <v-menu
          location="bottom center"
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
            :min-width="350"
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
                <div class="d-flex date-range-text font-weight-medium">
                  <div class="flex-grow-1 font-weight-regular opacity-70 text-body-small mb-1 mt-1">
                    {{ dateRangeText }}
                  </div>
                  <template v-if="route.query.start || route.query.end">
                    <v-btn
                      variant="text"
                      density="comfortable"
                      size="small"
                      color="primary"
                      rounded="xl"
                      @click="filterDateIndices = [0, filterRanges.availableMonths.length - 1]"
                    >
                      All dates
                    </v-btn>
                  </template>
                </div>
                <v-range-slider
                  v-model="filterDateIndices"
                  :max="filterRanges.availableMonths.length - 1"
                  :min="0"
                  :step="1"
                  hide-details
                  color="primary"
                  track-size="2"
                  thumb-size="16"
                  strict
                  thumb-label="always"
                  class="mt-8"
                >
                  <template #thumb-label="{ modelValue }">
                    <span class="text-no-wrap" style="font-size: 10px; font-weight: 600">
                      {{ formatMonthShort(filterRanges.availableMonths[modelValue!]) }}
                    </span>
                  </template>
                </v-range-slider>
              </div>

              <v-divider class="mt-1 ml-3 mr-3" />

              <div class="small-filters">
                <div class="media-type">
                  <p class="mt-2 mb-2 font-weight-medium">Media type</p>
                  <v-chip-group mandatory v-model="filterMediaType" color="primary" variant="text">
                    <v-chip value="all">All</v-chip>
                    <v-chip value="photo">Photos</v-chip>
                    <v-chip value="video">Videos</v-chip>
                  </v-chip-group>
                </div>

                <div class="person-name" v-if="filterRanges && filterRanges.people.length > 0">
                  <p class="mt-2 mb-2 font-weight-medium">People</p>
                  <v-select
                    width="430"
                    rounded
                    hide-details
                    clearable
                    placeholder="Anyone"
                    item-title="name"
                    item-value="name"
                    variant="solo"
                    density="comfortable"
                    multiple
                    chips
                    closable-chips
                    v-model="filterPeople"
                    :items="filterRanges.people.map((p) => ({ name: p[0], personId: p[1] }))"
                  >
                    <template #item="{ props, item }">
                      <v-list-item v-bind="props" :title="undefined">
                        <template #prepend>
                          <v-avatar>
                            <v-img
                              v-if="item.name"
                              :src="mediaItemService.getFaceThumbnail(item.personId)"
                              style="object-fit: cover"
                              :alt="item.name"
                            />
                          </v-avatar>
                        </template>
                        <v-list-item-title class="ml-3">
                          {{ item.name }}
                        </v-list-item-title>
                      </v-list-item>
                    </template>
                  </v-select>
                </div>

                <div class="country-code" v-if="filterRanges">
                  <p class="mt-2 mb-2 font-weight-medium">Country</p>
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
                    width="430"
                    rounded
                    hide-details
                    clearable
                    multiple
                    chips
                    closable-chips
                    placeholder="Any country"
                  >
                    <template #item="{ props, item }">
                      <v-list-item v-bind="props" :title="undefined">
                        <template #prepend>
                          <img
                            v-if="item.code"
                            :src="`https://purecatamphetamine.github.io/country-flag-icons/3x2/${item.code}.svg`"
                            width="20"
                            height="15"
                            style="object-fit: cover"
                            :alt="'Flag of ' + item.name"
                          />
                        </template>
                        <v-list-item-title class="ml-3">
                          {{ item.name }}
                        </v-list-item-title>
                      </v-list-item>
                    </template>
                  </v-select>
                </div>

                <div class="negative-query">
                  <p class="mt-2 mb-2 font-weight-medium">
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
                    clearable
                    placeholder="E.g. “orange”"
                    variant="solo"
                    density="comfortable"
                    width="430"
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
      <v-btn-toggle
        v-tooltip="{
          location: 'top',
          text: 'Sort',
        }"
        v-model="sortDirection"
        divided
        rounded="xl"
        color="primary"
        variant="tonal"
        class="sort-button-group"
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
  padding-bottom: 13px;
  border-radius: 10px;
  display: flex;
  align-items: center;
}

@media screen and (max-width: 1350px) {
  .search-query-title {
    display: none;
  }
}

.search-query-title {
  font-weight: 400;
  white-space: nowrap;
  padding-right: 15px;
  margin: 0;
}

.search-query-icon {
  opacity: 0.5;
  font-size: 30px;
}

.search-query-highlight {
  color: rgb(var(--v-theme-primary));
  font-weight: 600;
}

.advanced-search-button {
  display: flex;
  align-items: center;
  margin-right: 10px;
}

.active-filters-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  max-height: 60px;
  align-items: center;
  overflow: hidden;
}

.search-filters {
  max-width: 1100px;
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
  flex-direction: column;
  gap: 15px;
}

.small-filters > div {
  padding: 10px;
  padding-top: 0;
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

.date-range-text {
  align-items: center;
}

.sort-button-group {
  overflow-x: hidden;
}
</style>
