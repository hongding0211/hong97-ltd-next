import { Type } from 'class-transformer'
import { IsDate, IsOptional, IsString } from 'class-validator'

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  name?: string

  @IsOptional()
  @IsString()
  avatar?: string

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  birthday?: Date

  @IsOptional()
  @IsString()
  gender?: string

  @IsOptional()
  @IsString()
  bio?: string

  @IsOptional()
  metadata?: Record<string, any>
}
