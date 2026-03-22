import apiClient from './api.ts'
import { SearchResponse, SearchSuggestionsResponse } from '@/scripts/types/generated/timeline.ts'
import type { AxiosResponse } from 'axios'

const searchService = {
  async search(query: string, limit?: number): Promise<SearchResponse> {
    const response = await apiClient.get('/search', {
      params: { query, limit },
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
