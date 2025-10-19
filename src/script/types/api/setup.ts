// Maps to the PathInfoResponse schema
export interface PathInfoResponse {
  folder: string
  disk_available: number
  disk_used: number
  disk_total: number
  read_access: boolean
  write_access: boolean
}

// Maps to the DiskResponse schema
export interface DiskResponse {
  media_folder: PathInfoResponse
  thumbnails_folder: PathInfoResponse
}

// Maps to the MakeFolderBody schema
export interface MakeFolderBody {
  base_folder: string
  new_name: string
}

// Maps to the MakeFolderBody schema
export interface StartProcessingBody {
  user_folder: string
}

// Maps to the MediaSampleResponse schema
export interface MediaSampleResponse {
  read_access: boolean
  folder: string
  photo_count: number
  video_count: number
  samples: string[]
}

// Maps to the UnsupportedFilesResponse schema
export interface UnsupportedFilesResponse {
  read_access: boolean
  folder: string
  inaccessible_entries: string[]
  unsupported_files: Record<string, string[]> // Represents a dictionary of string arrays
  unsupported_count: number
}
