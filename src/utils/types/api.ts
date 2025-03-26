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
  disk_available: number
  disk_used: number
  disk_total: number
  read_access: boolean
  write_access: boolean
  folder: string
}

export interface FileCountResponse {
  photo_count: number
  video_count: number
  samples: string[]
  unsupported_count: number
  unsupported_files: { [key: string]: string[] }
  inaccessible_entries: string[]
  media_folder: PathInfoResponse
  thumbnails_folder: PathInfoResponse
}
