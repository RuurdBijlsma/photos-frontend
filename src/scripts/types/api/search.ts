export interface SearchResultItem {
  id: string
  isVideo: boolean
  isPanorama: boolean
  durationMs: number
  takenAtLocal: string
  ftsScore: number
  vectorScore: number
  combinedScore: number
}
