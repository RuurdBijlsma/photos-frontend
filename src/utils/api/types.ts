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

export interface AuthError {
  error: string
  description: string
}
export interface RegisterResponse{
  success: boolean,
}
export interface LoginResponse {
  token: string
  pid: string
  name: string
  is_verified: boolean
}
