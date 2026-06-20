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
  disk: DiskStats
}
