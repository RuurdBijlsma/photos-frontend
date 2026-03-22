import apiClient from './api.ts'
import { SearchResponse, SearchSuggestionsResponse } from '@/scripts/types/generated/timeline.ts'
import type { AxiosResponse } from 'axios'

export type SearchParams = {
  query: string
  limit?: number
  startDate?: string
  endDate?: string
  mediaType?: string
  sortBy?: string
  negativeQuery?: string
  countryCode?: string
  faceName?: string
}

const searchService = {
  async search(params: SearchParams): Promise<SearchResponse> {
    const response = await apiClient.get('/search', {
      params,
      responseType: 'arraybuffer',
    })
    const buffer = new Uint8Array(response.data)
    return SearchResponse.decode(buffer)
  },

  async suggestions(query: string, limit?: number): Promise<SearchSuggestionsResponse> {
    const response = await apiClient.get('/search/suggestions', {
      params: { query, limit },
      responseType: 'arraybuffer',
    })
    const buffer = new Uint8Array(response.data)
    return SearchSuggestionsResponse.decode(buffer)
  },

  randomSuggestion(): Promise<AxiosResponse<string>> {
    return apiClient.get<string>('/search/suggestions/random')
  },
}

export default searchService
