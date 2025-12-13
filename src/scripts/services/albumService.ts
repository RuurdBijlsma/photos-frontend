import type { AxiosResponse } from 'axios'
import apiClient from './api'
import type {
  AcceptInviteRequest,
  AddCollaboratorRequest,
  AddMediaToAlbumRequest,
  Album,
  AlbumCollaborator,
  AlbumSortField,
  AlbumSummary,
  AlbumWithCount,
  CheckInviteRequest,
  CreateAlbumRequest,
  SortDirection,
  UpdateAlbumRequest,
} from '@/scripts/types/api/album'
import { AlbumRatiosResponse, TimelineItemsResponse } from '@/scripts/types/generated/timeline.ts'

const albumService = {
  /**
   * List all albums for the current user.
   */
  getUserAlbums(
    sortField: AlbumSortField = 'updatedAt',
    sortDirection: SortDirection = 'desc',
  ): Promise<AxiosResponse<AlbumWithCount[]>> {
    return apiClient.get<AlbumWithCount[]>('/album', { params: { sortField, sortDirection } })
  },

  /**
   * Create a new album.
   */
  createAlbum(payload: CreateAlbumRequest): Promise<AxiosResponse<Album>> {
    return apiClient.post<Album>('/album', payload)
  },

  /**
   * Update an album's details (Name, Description, Visibility).
   */
  updateAlbum(albumId: string, payload: UpdateAlbumRequest): Promise<AxiosResponse<Album>> {
    return apiClient.put<Album>(`/album/${albumId}`, payload)
  },

  // --- Media Management ---

  /**
   * Add media items to an album.
   */
  addMediaToAlbum(albumId: string, payload: AddMediaToAlbumRequest): Promise<AxiosResponse<void>> {
    return apiClient.post<void>(`/album/${albumId}/media`, payload)
  },

  /**
   * Remove a specific media item from an album.
   */
  removeMediaFromAlbum(albumId: string, mediaItemId: string): Promise<AxiosResponse<void>> {
    return apiClient.delete<void>(`/album/${albumId}/media/${mediaItemId}`)
  },

  // --- Collaborator Management ---

  /**
   * Add a collaborator (user) to an album.
   */
  addCollaborator(
    albumId: string,
    payload: AddCollaboratorRequest,
  ): Promise<AxiosResponse<AlbumCollaborator>> {
    return apiClient.post<AlbumCollaborator>(`/album/${albumId}/collaborators`, payload)
  },

  /**
   * Remove a collaborator from an album.
   * Note: collaboratorId is the numeric ID of the link record, not the user's ID.
   */
  removeCollaborator(albumId: string, collaboratorId: number): Promise<AxiosResponse<void>> {
    return apiClient.delete<void>(`/album/${albumId}/collaborators/${collaboratorId}`)
  },

  // --- Invite / Sharing System ---

  /**
   * Generate a cross-server invitation link (token) for an album.
   */
  generateInvite(albumId: string): Promise<AxiosResponse<string>> {
    return apiClient.get<string>(`/album/${albumId}/invite`)
  },

  /**
   * Check an invite token to see what album it points to before accepting.
   */
  checkInvite(payload: CheckInviteRequest): Promise<AxiosResponse<AlbumSummary>> {
    return apiClient.post<AlbumSummary>('/album/invite/check', payload)
  },

  /**
   * Accept an invitation token to import the album.
   */
  acceptInvite(payload: AcceptInviteRequest): Promise<AxiosResponse<Album>> {
    return apiClient.post<Album>('/album/invite/accept', payload)
  },

  getTimelineIds(albumId: string): Promise<AxiosResponse<string[]>> {
    return apiClient.get<string[]>(`/album/${albumId}/ids`, { params: { sort: 'desc' } })
  },

  async getTimelineRatios(albumId: string): Promise<AlbumRatiosResponse> {
    const response = await apiClient.get(`/album/${albumId}/ratios`, {
      params: { sort: 'desc' },
      responseType: 'arraybuffer',
    })
    const buffer = new Uint8Array(response.data)
    return AlbumRatiosResponse.decode(buffer)
  },

  async getMediaByMonths(albumId: string, months: string[]): Promise<TimelineItemsResponse> {
    const response = await apiClient.get(`/album/${albumId}/by-month`, {
      responseType: 'arraybuffer',
      params: {
        sort: 'desc',
        months: months.join(','),
      },
    })
    const buffer = new Uint8Array(response.data)
    return TimelineItemsResponse.decode(buffer)
  },
}

export default albumService
