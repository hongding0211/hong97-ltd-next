import { IsOptional, IsString } from 'class-validator'

export class ModifyPasswordDto {
  @IsString()
  @IsOptional()
  email?: string

  @IsString()
  @IsOptional()
  phoneNumber?: string

  @IsString()
  originalPassword: string

  @IsString()
  newPassword: string
}
