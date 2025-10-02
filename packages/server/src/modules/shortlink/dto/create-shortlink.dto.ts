import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsOptional,
  IsString,
  IsUrl,
} from 'class-validator'

export class CreateShortLinkDto {
  @IsUrl({}, { message: 'Invalid URL format' })
  originalUrl: string

  @IsOptional()
  @IsString()
  title?: string

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsString()
  shortCode?: string

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
