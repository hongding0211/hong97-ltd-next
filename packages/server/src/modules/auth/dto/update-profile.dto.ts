import { IsNumber, IsOptional, IsString } from 'class-validator'

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  name?: string

  @IsOptional()
  @IsString()
  avatar?: string

  @IsOptional()
  @IsNumber()
  birthday?: number

  @IsOptional()
  @IsString()
  gender?: string

  @IsOptional()
  @IsString()
  bio?: string

  @IsOptional()
  metadata?: Record<string, any>
}
