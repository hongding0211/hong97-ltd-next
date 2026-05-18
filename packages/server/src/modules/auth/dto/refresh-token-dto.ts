import { IsOptional, IsString } from 'class-validator'

export class RefreshTokenRequestDto {
  @IsOptional()
  @IsString()
  refreshToken?: string
}

export class RefreshTokenDto {
  accessToken!: string
  refreshToken!: string
  accessTokenExpiresIn!: string
  refreshTokenExpiresIn!: string
}
