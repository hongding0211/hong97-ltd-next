import {
  IsEmail,
  IsObject,
  IsOptional,
  IsPhoneNumber,
  IsString,
  MinLength,
} from 'class-validator'

export type RegisterType = 'local' | 'phone' | 'oauth'

export class UserProfileDto {
  @IsString()
  name: string

  @IsString()
  @IsOptional()
  avatar?: string

  @IsString()
  @IsOptional()
  birthday?: string

  @IsString()
  @IsOptional()
  gender?: string

  @IsString()
  @IsOptional()
  bio?: string
}

export class LocalRegisterDto {
  @IsOptional()
  @IsEmail()
  email?: string

  @IsOptional()
  @IsPhoneNumber()
  phoneNumber?: string

  @IsString()
  @MinLength(6)
  password: string

  @IsObject()
  profile: UserProfileDto
}

export class PhoneRegisterDto {
  @IsPhoneNumber()
  phoneNumber: string

  @IsString()
  verificationCode: string

  @IsString()
  username: string

  @IsObject()
  @IsOptional()
  profile?: UserProfileDto
}

export class OAuthRegisterDto {
  @IsString()
  provider: string

  @IsString()
  accessToken: string

  @IsString()
  username: string

  @IsObject()
  @IsOptional()
  profile?: UserProfileDto
}

export class RegisterDto {
  @IsString()
  type: RegisterType

  @IsObject()
  credentials: LocalRegisterDto | PhoneRegisterDto | OAuthRegisterDto
}
