export class UserProfileResponseDto {
  name: string
  avatar?: string
  bio?: string
  gender?: string
  birthday?: number
  metadata?: Record<string, any>
}

export class UserResponseDto {
  userId: string
  profile: UserProfileResponseDto
  isAdmin?: boolean
}
