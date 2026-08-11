import { IsString, MaxLength, MinLength } from 'class-validator'
import {
  UserProfileResponseDto,
  UserResponseDto,
} from '../../user/dto/user.response.dto'

export class CreatePermissionGrantDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  userId: string
}

export class PermissionGrantResponseDto {
  userId: string
  profile?: UserProfileResponseDto
  createdAt?: Date
}

export class PermissionPointResponseDto {
  key: string
  grants: PermissionGrantResponseDto[]
}

export class PermissionManagementResponseDto {
  points: PermissionPointResponseDto[]
  users: UserResponseDto[]
}
