export interface SearchFilterRanges {
  availableMonths: string[]
  people: string[][]
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
  countryCodes?: string
  faceNames?: string
  all_faces_required?: boolean
}
