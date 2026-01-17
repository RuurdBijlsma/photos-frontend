import type { AlbumTimelineItem } from '@/scripts/types/generated/timeline.ts'

export interface SimpleLayoutRow {
  items: AlbumTimelineItem[]
  height: number
  key: string
  offsetTop: number
  thumbnailSize: number
  firstRow: boolean
  lastRow: boolean
}

export interface LayoutRow {
  items: LayoutRowItem[]
  height: number
  date: Date
  monthId: string
  firstOfTheMonth: boolean
  lastOfTheMonth: boolean
  key: string
  offsetTop: number
  thumbnailSize: number
}

export interface LayoutRowItem {
  ratio: number
  index: number
}
