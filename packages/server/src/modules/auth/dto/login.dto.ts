import {
  IsEmail,
  IsObject,
  IsOptional,
  IsPhoneNumber,
  IsString,
  MinLength,
} from 'class-validator'
import { UserResponseDto } from '../../../../src/modules/user/dto/user.response.dto'

export type LoginType = 'local' | 'phone' | 'github'

export class LocalLoginDto {
  @IsOptional()
  @IsEmail()
  email?: string

  @IsOptional()
  @IsPhoneNumber()
  phoneNumber?: string

  @IsString()
  @MinLength(6)
  password: string
}

export class PhoneLoginDto {
  @IsPhoneNumber()
  phoneNumber: string

  @IsString()
  verificationCode: string
}

export class OAuthLoginDto {
  @IsString()
  provider: string

  @IsString()
  accessToken: string
}

export class LoginDto {
  @IsString()
  type: LoginType

  @IsObject()
  credentials: LocalLoginDto | PhoneLoginDto | OAuthLoginDto
}

export class LoginResponseDto {
  token: string
  user: UserResponseDto
}
