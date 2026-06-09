import { Type } from 'class-transformer'
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator'

export class CreateWalkcalcGroupDto {
  @IsString()
  @IsNotEmpty()
  name: string
}

export class JoinWalkcalcGroupDto {
  @IsString()
  @IsNotEmpty()
  code: string
}

export class CreateWalkcalcTempUserDto {
  @IsString()
  @IsNotEmpty()
  name: string
}

export class InviteWalkcalcUsersDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  userIds: string[]
}

export class RenameWalkcalcGroupDto {
  @IsString()
  @IsNotEmpty()
  name: string
}

export class QueryWalkcalcGroupsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 10

  @IsOptional()
  @IsString()
  search?: string

  @IsOptional()
  @IsIn(['all', 'active', 'archived'])
  archiveState?: 'all' | 'active' | 'archived' = 'all'
}
