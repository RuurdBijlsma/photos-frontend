import type { Theme } from '@/script/types/themeColor.ts'

export interface RandomPhotoResponse {
  mediaId: string
  themes: null | Theme[]
}
