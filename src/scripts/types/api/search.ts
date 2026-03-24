export interface SearchFilterRanges {
  available_months: string[]
  people: string[]
  countries: string[][]
}

export type SearchParams = {
  query: string
  limit?: number
  startDate?: string
  endDate?: string
  mediaType?: string
  sortBy?: string
  negativeQuery?: string
  countryCodes: string
  faceName?: string
}
