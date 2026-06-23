export interface DiskInfo {
  diskAvailable: number
  diskUsed: number
  diskTotal: number
}

export interface DiskStats {
  thumbnailDrive: DiskInfo
  mediaDrive: DiskInfo
  areSameDrive: boolean
}

export interface SystemStats {
  hasClusteredPeople: boolean
  hasClusteredPhotos: boolean
  allow_file_modifications: boolean
  allow_file_deletion: boolean
  disk: DiskStats
}
