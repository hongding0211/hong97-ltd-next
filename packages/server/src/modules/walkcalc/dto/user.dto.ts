import { ArrayMaxSize, IsArray, IsOptional, IsString } from 'class-validator'

export class WalkcalcUsersLookupDto {
  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  userIds: string[]
}

export class SearchWalkcalcUsersDto {
  @IsOptional()
  @IsString()
  name?: string
}
