export interface User {
  pid: string
  name: string
  email: string
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData extends LoginCredentials {
  name: string
}

export interface ApiError {
  error: string
  description: string
}

export interface RegisterResponse {
  success: boolean
}

export interface LoginResponse {
  token: string
  pid: string
  name: string
  is_verified: boolean
}

export interface PathInfoResponse {
  diskAvailable: number
  diskUsed: number
  diskTotal: number
  readAccess: boolean
  writeAccess: boolean
}

export interface FileCountResponse {
  count: number
  samples: string[]
  unsupportedFilesCount: number
  unsupportedExtensions: string[]
  mediaFolder: PathInfoResponse
  thumbnailsFolder: PathInfoResponse
}
