import type { Theme } from '@/script/types/themeColor.ts'

export interface RandomPhotoResponse {
  media_id: string
  themes: null | Theme[]
}
