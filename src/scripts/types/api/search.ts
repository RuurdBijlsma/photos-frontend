export interface SearchFilterRanges {
  dateStart: string
  dateEnd: string
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
  countryCode: string[]
  faceName?: string
}
