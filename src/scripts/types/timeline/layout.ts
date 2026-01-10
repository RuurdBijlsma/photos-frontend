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
