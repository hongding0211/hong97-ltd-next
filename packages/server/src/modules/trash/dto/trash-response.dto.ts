import { LivePhotoMedia } from '../schema/trash.schema'

export interface CommentDto {
  commentId: string
  userId?: string
  anonymous: boolean
  name?: string
  time: number
  content: string
}

export class TrashResponseDto {
  _id: string
  content?: string
  media?: LivePhotoMedia[]
  tags: string[]
  timestamp: number
  likeCount: number
  isLiked: boolean
  comments: CommentDto[]
  createdAt: Date
  updatedAt: Date
}
