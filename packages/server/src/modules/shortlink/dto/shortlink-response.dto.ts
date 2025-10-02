export class ShortLinkResponseDto {
  id: string
  shortCode: string
  originalUrl: string
  title?: string
  description?: string
  clickCount: number
  isActive: boolean
  expiresAt?: Date
  createdBy: string
  tags: string[]
  createdAt: Date
  updatedAt: Date
}

export class ShortLinkListResponseDto {
  data: ShortLinkResponseDto[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}
