import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator'

export class RequestUploadDto {
  @IsString()
  fileName: string

  @IsString()
  @IsOptional()
  contentType?: string

  @IsString()
  @IsOptional()
  app?: string

  @IsBoolean()
  @IsOptional()
  compress?: string

  @IsNumber()
  @IsOptional()
  quality?: number
}
