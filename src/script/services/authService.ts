import type { AxiosResponse } from 'axios';
import apiClient from './api';
import type {
  Tokens,
  User,
  LoginUser,
  CreateUser,
  RefreshTokenPayload
} from '@/script/types/api/auth.ts';

// This service is a collection of functions that map to your /auth endpoints
const authService = {
  // We use generics to tell Axios what `response.data` will look like
  register(data: CreateUser): Promise<AxiosResponse<User>> {
    return apiClient.post<User>('/auth/register', data);
  },

  login(data: LoginUser): Promise<AxiosResponse<Tokens>> {
    return apiClient.post<Tokens>('/auth/login', data);
  },

  logout(data: RefreshTokenPayload): Promise<AxiosResponse<void>> {
    return apiClient.post<void>('/auth/logout', data);
  },

  refreshSession(data: RefreshTokenPayload): Promise<AxiosResponse<Tokens>> {
    return apiClient.post<Tokens>('/auth/refresh', data);
  },

  getMe(): Promise<AxiosResponse<User>> {
    return apiClient.get<User>('/auth/me');
  }
};

export default authService;
