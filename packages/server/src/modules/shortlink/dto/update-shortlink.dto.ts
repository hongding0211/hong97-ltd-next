import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsOptional,
  IsString,
  IsUrl,
} from 'class-validator'

export class UpdateShortLinkDto {
  @IsOptional()
  @IsUrl({}, { message: 'Invalid URL format' })
  originalUrl?: string

  @IsOptional()
  @IsString()
  title?: string

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[]

  @IsOptional()
  @IsDateString()
  expiresAt?: string

  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}
