import type { TimelineItem } from '@/scripts/types/generated/timeline'

// Enums
export type AlbumRole = 'Owner' | 'Contributor' | 'Viewer'
export type SortDirection = 'asc' | 'desc'
export type AlbumSortField = 'updatedAt' | 'latestPhoto' | 'name'

// Entities
export interface Album {
  id: string
  ownerId: number
  name: string
  description: string | null
  thumbnailId: string | null
  isPublic: boolean
  createdAt: string // ISO Date string
  updatedAt: string // ISO Date string
  mediaCount: number
  latestMediaItemTimestamp: string | null // ISO Date string
}

export interface AlbumCollaborator {
  id: number
  albumId: string
  userId: number
  role: AlbumRole
  addedAt: string // ISO Date string
}

export interface CollaboratorSummary {
  id: number
  name: string
  role: AlbumRole
}

export interface AlbumMediaItemSummary {
  mediaItem: TimelineItem
  addedAt: string // ISO Date string
}

export interface AlbumSummary {
  name: string
  description: string | null
  relativePaths: string[]
}

// Responses
export interface AlbumDetailsResponse {
  id: string
  name: string
  description?: string
  thumbnailId?: string
  isPublic: boolean
  ownerId: number
  createdAt: string // ISO Date string
  mediaItems: AlbumMediaItemSummary[]
  collaborators: CollaboratorSummary[]
}

// Request Payloads
export interface CreateAlbumRequest {
  name: string
  description?: string
  isPublic: boolean
  mediaItemIds: string[]
}

export interface UpdateAlbumRequest {
  name?: string
  description?: string
  isPublic?: boolean
  thumbnailId?: string
}

export interface AddMediaToAlbumRequest {
  mediaItemIds: string[]
}

export interface AddCollaboratorRequest {
  userEmail: string
  role: AlbumRole
}

export interface CheckInviteRequest {
  token: string
}

export interface AcceptInviteRequest {
  token: string
  name: string
  description?: string
}
