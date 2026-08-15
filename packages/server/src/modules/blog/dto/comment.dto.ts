import { IsBoolean, IsOptional, IsString } from 'class-validator'
import { UserResponseDto } from '../../user/dto/user.response.dto'

export class CommentDto {
  @IsString()
  blogId: string

  @IsString()
  content: string

  @IsString()
  @IsOptional()
  parentCommentId?: string

  @IsBoolean()
  @IsOptional()
  anonymous?: boolean
}

export class CommentResponseDto {
  commentId?: string
  parentCommentId?: string
  replyToCommentId?: string
  replyToName?: string
  userId?: string
  anonymous: boolean
  name?: string
  time: number
  content: string
  deleted?: boolean
}

export class CommentsDto {
  @IsString()
  blogId: string
}

export class CommentsResponseDto {
  comments: (CommentResponseDto & { user?: UserResponseDto })[]
}
