// Maps to the PathInfoResponse schema
export interface PathInfoResponse {
  folder: string
  diskAvailable: number
  diskUsed: number
  diskTotal: number
  readAccess: boolean
  writeAccess: boolean
}

// Maps to the DiskResponse schema
export interface DiskResponse {
  mediaFolder: PathInfoResponse
  thumbnailsFolder: PathInfoResponse
}

// Maps to the MakeFolderBody schema
export interface MakeFolderBody {
  baseFolder: string
  newName: string
}

// Maps to the MakeFolderBody schema
export interface StartProcessingBody {
  userFolder: string
}

// Maps to the MediaSampleResponse schema
export interface MediaSampleResponse {
  readAccess: boolean
  folder: string
  photoCount: number
  videoCount: number
  samples: string[]
}

// Maps to the UnsupportedFilesResponse schema
export interface UnsupportedFilesResponse {
  readAccess: boolean
  folder: string
  inaccessibleEntries: string[]
  unsupportedFiles: Record<string, string[]> // Represents a dictionary of string arrays
  unsupportedCount: number
}
