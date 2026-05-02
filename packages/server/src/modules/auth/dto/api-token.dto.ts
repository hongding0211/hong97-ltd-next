import { IsString, MaxLength, MinLength } from 'class-validator'

export class CreateApiTokenDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name: string
}

export class ApiTokenResponseDto {
  tokenId: string
  name: string
  tokenPrefix: string
  lastUsedAt?: Date | null
  createdAt?: Date
  updatedAt?: Date
}

export class CreateApiTokenResponseDto extends ApiTokenResponseDto {
  apiToken: string
}

export class DeleteApiTokenParamsDto {
  @IsString()
  tokenId: string
}
