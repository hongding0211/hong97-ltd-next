export class UserProfileResponseDto {
  name: string
  avatar?: string
  bio?: string
  metadata?: Record<string, any>
}

export class UserResponseDto {
  userId: string
  profile: UserProfileResponseDto
}
