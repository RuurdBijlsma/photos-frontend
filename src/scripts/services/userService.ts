import type { AxiosResponse } from 'axios'
import apiClient from './api.ts'
import type { UserProfile } from '@/scripts/types/api/user.ts'

const userService = {
  getUserProfile(userId: number): Promise<AxiosResponse<UserProfile>> {
    return apiClient.get<UserProfile>(`/user/${userId}/profile`)
  },

  updateProfile(data: Partial<UserProfile>): Promise<AxiosResponse<UserProfile>> {
    return apiClient.put<UserProfile>('/user/profile', data)
  },
}

export default userService
