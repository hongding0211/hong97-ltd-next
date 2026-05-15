import {
  IsIn,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator'

export class RegisterPushDeviceDto {
  @IsString()
  @IsNotEmpty()
  appId: string

  @IsIn(['ios'])
  platform: 'ios'

  @IsString()
  @IsNotEmpty()
  providerToken: string

  @IsIn(['sandbox', 'production'])
  environment: 'sandbox' | 'production'

  @IsString()
  @IsNotEmpty()
  locale: string

  @IsString()
  @IsOptional()
  deviceId?: string

  @IsString()
  @IsOptional()
  appVersion?: string

  @IsString()
  @IsOptional()
  bundleId?: string

  @IsString()
  @IsOptional()
  deviceModel?: string

  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>
}
