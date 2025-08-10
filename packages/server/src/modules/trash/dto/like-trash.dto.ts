import { IsString } from 'class-validator'

export class LikeTrashDto {
  @IsString()
  trashId: string
}
