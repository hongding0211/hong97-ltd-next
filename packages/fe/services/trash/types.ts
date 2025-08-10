import { API } from '../types'

export interface LivePhotoMedia {
  imageUrl: string
  videoUrl?: string
}

export interface CreateTrashDto {
  content?: string
  media?: LivePhotoMedia[]
  tags?: string[]
}

export interface TrashResponseDto {
  _id: string
  content?: string
  media?: LivePhotoMedia[]
  tags: string[]
  timestamp: number
  likeCount: number
  isLiked: boolean
  createdAt: string
  updatedAt: string
}

export interface QueryTrashDto {
  page?: number
  pageSize?: number
  tags?: string[]
}

export interface LikeTrashDto {
  trashId: string
}

export interface PaginationResponseDto<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
}

export type TrashAPIS = {
  PostCreateTrash: API<undefined, CreateTrashDto, TrashResponseDto>
  GetTrashList: API<
    QueryTrashDto,
    undefined,
    PaginationResponseDto<TrashResponseDto>
  >
  GetTrashById: API<{ id: string }, undefined, TrashResponseDto>
  DeleteTrash: API<{ id: string }, undefined, { success: boolean }>
  PostLikeTrash: API<undefined, LikeTrashDto, TrashResponseDto>
}
