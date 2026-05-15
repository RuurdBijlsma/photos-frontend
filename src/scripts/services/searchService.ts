import apiClient from './api.ts'
import { SearchResponse, SearchSuggestionsResponse } from '@/scripts/types/generated/timeline.ts'
import type { AxiosResponse } from 'axios'
import type { SearchFilterRanges, SearchParams } from '@/scripts/types/api/search.ts'

const searchService = {
  async search(params: SearchParams): Promise<SearchResponse> {
    console.log('Search with params', params)
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

  filterRanges(): Promise<AxiosResponse<SearchFilterRanges>> {
    return apiClient.get<SearchFilterRanges>('/search/params')
  },
}

export default searchService
