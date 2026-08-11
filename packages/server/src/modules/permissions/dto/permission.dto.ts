import { Type } from 'class-transformer'
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator'
import { UserResponseDto } from '../../user/dto/user.response.dto'

export class CreatePermissionGrantDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  userId: string
}

export class PermissionPointResponseDto {
  key: string
  grantCount: number
}

export class PermissionManagementResponseDto {
  points: PermissionPointResponseDto[]
}

export class PermissionUsersQueryDto {
  // The shared frontend client uses one params object for path interpolation
  // and query serialization, so the path key is accepted and ignored here.
  @IsOptional()
  @IsString()
  @MaxLength(80)
  permissionKey?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize?: number = 20

  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string

  @IsOptional()
  @IsIn(['granted', 'available'])
  scope?: 'granted' | 'available' = 'granted'
}

export class PermissionUserResponseDto extends UserResponseDto {
  granted: boolean
}

export class PermissionUsersResponseDto {
  permissionKey: string
  data: PermissionUserResponseDto[]
  total: number
  page: number
  pageSize: number
}
