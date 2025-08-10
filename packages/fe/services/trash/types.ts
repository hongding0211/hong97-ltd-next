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

export interface TrashComment {
  commentId: string
  userId?: string
  anonymous: boolean
  name?: string
  time: number
  content: string
}

export interface TrashResponseDto {
  _id: string
  content?: string
  media?: LivePhotoMedia[]
  tags: string[]
  timestamp: number
  likeCount: number
  isLiked: boolean
  comments: TrashComment[]
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

export interface CommentTrashDto {
  trashId: string
  content: string
  anonymous?: boolean
}

export interface DeleteCommentDto {
  trashId: string
  commentId: string
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
  PostCommentTrash: API<undefined, CommentTrashDto, TrashResponseDto>
  DeleteCommentTrash: API<DeleteCommentDto, undefined, TrashResponseDto>
}
