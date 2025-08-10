import { LivePhotoMedia } from '../schema/trash.schema'

export class TrashResponseDto {
  _id: string
  content?: string
  media?: LivePhotoMedia[]
  tags: string[]
  timestamp: number
  createdAt: Date
  updatedAt: Date
}
