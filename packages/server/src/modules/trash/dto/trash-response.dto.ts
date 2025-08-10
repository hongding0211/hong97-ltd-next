import { LivePhotoMedia } from '../schema/trash.schema'

export class TrashResponseDto {
  _id: string
  content?: string
  media?: LivePhotoMedia[]
  tags: string[]
  timestamp: number
  likeCount: number
  isLiked: boolean
  createdAt: Date
  updatedAt: Date
}
