// Maps to the PathInfoResponse schema
import type { Theme } from '@/utils/types/color.ts'

export interface RandomPhotoResponse {
  media_id: string
  themes: null | Theme[]
}
