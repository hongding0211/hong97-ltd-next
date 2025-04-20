import { IsString } from 'class-validator'

export class ModifyPasswordDto {
  @IsString()
  originalPassword: string

  @IsString()
  newPassword: string
}
