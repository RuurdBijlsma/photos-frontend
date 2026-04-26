import apiClient from './api.ts'
import { FullPersonMediaResponse, ListPeopleResponse } from '@/scripts/types/generated/timeline.ts'
import type { AxiosResponse } from 'axios'

const peopleService = {
  async list(): Promise<ListPeopleResponse> {
    const response = await apiClient.get('/people', {
      responseType: 'arraybuffer',
    })
    const buffer = new Uint8Array(response.data)
    return ListPeopleResponse.decode(buffer)
  },

  async get(personId: number): Promise<FullPersonMediaResponse> {
    const response = await apiClient.get(`/people/${personId}`, {
      responseType: 'arraybuffer',
    })
    const buffer = new Uint8Array(response.data)
    return FullPersonMediaResponse.decode(buffer)
  },

  update(personId: number, name: string): Promise<AxiosResponse> {
    return apiClient.patch(`/people/${personId}`, { name })
  },
}

export default peopleService
