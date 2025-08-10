import { IsBoolean, IsOptional, IsString } from 'class-validator'

export class CommentTrashDto {
  @IsString()
  trashId: string

  @IsString()
  content: string

  @IsOptional()
  @IsBoolean()
  anonymous?: boolean
}
