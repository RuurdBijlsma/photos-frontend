import { defineStore } from 'pinia'
import { ref } from 'vue'

interface GeoResponse {
  latitude: string
  longitude: string
}

interface SunResponse {
  results: {
    sunrise: string
    sunset: string
  }
  status: string
}

interface SunCache {
  sunrise: string
  sunset: string
  lastFetched: number
}

const CACHE_KEY = 'sun_store_cache'
const CACHE_DURATION = 12 * 60 * 60 * 1000 // 12 hours in milliseconds

// Helper to safely read cache (handles SSR environments)
function getCachedData(): SunCache | null {
  if (typeof window === 'undefined') return null
  try {
    const cached = localStorage.getItem(CACHE_KEY)
    return cached ? JSON.parse(cached) : null
  } catch (err) {
    console.error('Failed to read from localStorage', err)
    return null
  }
}

// Helper to safely write cache
function setCachedData(data: SunCache): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data))
  } catch (err) {
    console.error('Failed to write to localStorage', err)
  }
}

export const useSunStore = defineStore('sun', () => {
  // Try initializing state from valid cache immediately on store instantiation
  const initialCache = getCachedData()
  const isCacheFresh = initialCache && Date.now() - initialCache.lastFetched < CACHE_DURATION

  const sunrise = ref<Date | null>(
    isCacheFresh && initialCache ? new Date(initialCache.sunrise) : null,
  )
  const sunset = ref<Date | null>(
    isCacheFresh && initialCache ? new Date(initialCache.sunset) : null,
  )

  const loading = ref<boolean>(false)
  const error = ref<string | null>(null)

  // Modified signature to allow disabling the cache (e.g., force refresh) if needed
  async function fetchSunTimes(useCache: boolean = true): Promise<void> {
    if (useCache) {
      const cached = getCachedData()
      if (cached) {
        const age = Date.now() - cached.lastFetched
        if (age < CACHE_DURATION) {
          sunrise.value = new Date(cached.sunrise)
          sunset.value = new Date(cached.sunset)
          return
        }
      }
    }

    loading.value = true
    error.value = null

    try {
      // 1. Get approximate location via IP
      const geoResponse = await fetch('https://get.geojs.io/v1/ip/geo.json')
      if (!geoResponse.ok) throw new Error('Failed to fetch location data')
      const geoData = (await geoResponse.json()) as GeoResponse
      const { latitude, longitude } = geoData

      // 2. Get sunrise and sunset times based on the coordinates
      const sunResponse = await fetch(
        `https://api.sunrise-sunset.org/json?lat=${latitude}&lng=${longitude}&formatted=0`,
      )
      if (!sunResponse.ok) throw new Error('Failed to fetch sun times')
      const sunData = (await sunResponse.json()) as SunResponse

      const fetchedSunrise = new Date(sunData.results.sunrise)
      const fetchedSunset = new Date(sunData.results.sunset)

      sunrise.value = fetchedSunrise
      sunset.value = fetchedSunset

      // 3. Save to cache
      setCachedData({
        sunrise: fetchedSunrise.toISOString(),
        sunset: fetchedSunset.toISOString(),
        lastFetched: Date.now(),
      })
    } catch (err: unknown) {
      if (err instanceof Error) {
        error.value = err.message
      } else {
        error.value = 'An unexpected error occurred'
      }
      console.error(err)
    } finally {
      loading.value = false
    }
  }

  return { sunrise, sunset, loading, error, fetchSunTimes }
})
