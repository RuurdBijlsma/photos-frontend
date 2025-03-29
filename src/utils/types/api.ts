export type RequestParams = {
  method?: string
  path: string
  body?: Record<string, any>
  authenticate?: boolean
  timeout?: number
}

export type RequestRequired = { path: string } & Partial<
  Omit<RequestParams, 'path'>
>

export interface ServerError {
  message: string
  status: number
  statusText: string
}

export type ApiError =
  | { tokenProvided: false }
  | { serverReachable: false; tokenProvided: true }
  | { serverReachable: true; tokenProvided: true; aborted: true }
  | {
      tokenProvided: true
      serverReachable: true
      aborted: false
      error: ServerError
    }

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

export interface UserFolderResponse {
  read_access: boolean
  folder: string
  photo_count: number
  video_count: number
  samples: string[]
  inaccessible_entries: string[]
  unsupported_count: number
  unsupported_files: { [key: string]: string[] }
}

export interface DiskResponse {
  media_folder: PathInfoResponse
  thumbnails_folder: PathInfoResponse
}
