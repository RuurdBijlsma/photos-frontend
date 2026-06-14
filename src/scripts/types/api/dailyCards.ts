export interface DailyCardResponse {
  id: number
  cardDate: string | null // NaiveDate
  cardType: string
  title: string
  subtitle: string | null
  thumbnailMediaItemId: string | null
  payload: Record<string, unknown>
}
