import type { Theme } from '@/scripts/types/themeColor.ts'

export interface RandomPhotoResponse {
  mediaId: string
  themes: null | Theme[]
}
