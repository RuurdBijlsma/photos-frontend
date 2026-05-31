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

export const useSunStore = defineStore('sun', () => {
  const sunrise = ref<Date | null>(null)
  const sunset = ref<Date | null>(null)
  const loading = ref<boolean>(false)
  const error = ref<string | null>(null)

  async function fetchSunTimes(useCache: true): Promise<void> {
    if (sunrise.value && sunset.value && useCache) {
      return
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
      sunrise.value = new Date(sunData.results.sunrise)
      sunset.value = new Date(sunData.results.sunset)
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
