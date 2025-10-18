// Maps to the UserRole enum
export type UserRole = 'admin' | 'user';

// Maps to the Tokens schema
export interface Tokens {
  access_token: string;
  refresh_token: string;
}

// Maps to the User schema
export interface User {
  id: number;
  created_at: string; // ISO date string
  updated_at: string; // ISO date string
  email: string;
  name: string;
  role: UserRole;
  media_folder?: string | null;
}

// Maps to request body schemas for type safety in our service calls
export interface LoginUser {
  email: string;
  password: string;
}

export interface CreateUser {
  email: string;
  name: string;
  password: string;
}

export interface RefreshTokenPayload {
  refresh_token: string;
}
