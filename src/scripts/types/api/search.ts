export interface SearchResultItem {
  id: string
  is_video: boolean
  is_panorama: boolean
  duration_ms: number
  taken_at_local: string
  fts_score: number
  vector_score: number
  combined_score: number
}
