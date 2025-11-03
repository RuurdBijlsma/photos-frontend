// Maps to the UserRole enum
export type UserRole = 'admin' | 'user'

// Maps to the Tokens schema
export interface Tokens {
  accessToken: string
  refreshToken: string
  expiry: number
}

// Maps to the User schema
export interface User {
  id: number
  createdAt: string // ISO date string
  updatedAt: string // ISO date string
  email: string
  name: string
  role: UserRole
  mediaFolder?: string | null
}

// Maps to request body schemas for type safety in our service calls
export interface LoginUser {
  email: string
  password: string
}

export interface CreateUser {
  email: string
  name: string
  password: string
}

export interface RefreshTokenPayload {
  refreshToken: string
}
