import type { AxiosResponse } from 'axios'
import apiClient from './api'
import type {
  AcceptInviteRequest,
  AddCollaboratorRequest,
  AddMediaToAlbumRequest,
  Album,
  AlbumCollaborator,
  AlbumDetailsResponse,
  AlbumSummary,
  CheckInviteRequest,
  CreateAlbumRequest,
  UpdateAlbumRequest,
} from '@/scripts/types/api/album'

const albumService = {
  /**
   * List all albums for the current user.
   */
  getUserAlbums(): Promise<AxiosResponse<Album[]>> {
    return apiClient.get<Album[]>('/album')
  },

  /**
   * Create a new album.
   */
  createAlbum(payload: CreateAlbumRequest): Promise<AxiosResponse<Album>> {
    return apiClient.post<Album>('/album', payload)
  },

  /**
   * Get details for a specific album.
   */
  getAlbumDetails(albumId: string): Promise<AxiosResponse<AlbumDetailsResponse>> {
    return apiClient.get<AlbumDetailsResponse>(`/album/${albumId}`)
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
}

export default albumService
