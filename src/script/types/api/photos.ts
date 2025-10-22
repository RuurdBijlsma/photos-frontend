import type { Theme } from '@/script/types/themeColor.ts'

export interface RandomPhotoResponse {
  media_id: string
  themes: null | Theme[]
}

export interface TimelineMonthInfo {
  year: number
  month: number
  media_count: number
}

export interface MediaItemDto {
  i: string
  w: number
  h: number
  v: boolean
  p: boolean
  t: string
  d: number | null
}

export interface DayGroup {
  date: string
  media_items: MediaItemDto[]
}

export interface MonthGroup {
  month: string
  days: DayGroup[]
}

export interface PaginatedMediaResponse {
  months: MonthGroup[]
}
