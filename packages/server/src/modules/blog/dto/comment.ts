import { IsBoolean, IsOptional, IsString } from 'class-validator'
import { UserResponseDto } from '../../user/dto/user.response.dto'

export class CommentDto {
  @IsString()
  blogId: string

  @IsString()
  content: string

  @IsBoolean()
  @IsOptional()
  anonymous?: boolean
}

export class CommentResponseDto {
  commentId?: string
  userId?: string
  anonymous: boolean
  name?: string
  time: number
  content: string
}

export class CommentsDto {
  @IsString()
  blogId: string
}

export class CommentsResponseDto {
  comments: (CommentResponseDto & { user?: UserResponseDto })[]
}
