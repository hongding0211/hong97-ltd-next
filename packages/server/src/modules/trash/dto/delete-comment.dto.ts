import { IsString } from 'class-validator'

export class DeleteCommentDto {
  @IsString()
  trashId: string

  @IsString()
  commentId: string
}
