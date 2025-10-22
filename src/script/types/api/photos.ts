import type { Theme } from '@/script/types/themeColor.ts'

export interface RandomPhotoResponse {
  mediaId: string
  themes: null | Theme[]
}

export interface TimelineMonthInfo {
  year: number
  month: number
  mediaCount: number
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

export interface MonthGroup {
  month: string
  mediaItems: MediaItemDto[]
}

export interface PaginatedMediaResponse {
  months: MonthGroup[]
}
