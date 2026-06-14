export interface DailyCardResponse {
  id: number
  cardDate: string | null // NaiveDate
  cardType: 'cluster' | 'on_this_day' | 'estimatr'
  title: string
  subtitle: string | null
  thumbnailMediaItemId: string | null
  payload: Record<string, unknown>
}
