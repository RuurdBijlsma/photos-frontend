// Maps to the PathInfoResponse schema
import type { Theme } from '@/utils/types/color.ts'

export interface PathInfoResponse {
  folder: string
  disk_available: number
  disk_used: number
  disk_total: number
  read_access: boolean
  write_access: boolean
}

export interface RandomPhotoResponse {
  media_id: string
  themes: null | Theme[]
}
