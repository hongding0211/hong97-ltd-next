import { IsOptional, IsString } from 'class-validator'

export class AppleNativeLoginDto {
  @IsString()
  identityToken!: string

  @IsString()
  @IsOptional()
  authorizationCode?: string

  @IsString()
  @IsOptional()
  fullName?: string

  @IsString()
  @IsOptional()
  nonce?: string
}
