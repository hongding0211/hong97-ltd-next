import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator'

export class RequestUploadDto {
  @IsString()
  fileName: string

  @IsString()
  @IsOptional()
  contentType?: string

  @IsInt()
  @IsPositive()
  @IsOptional()
  fileSize?: number

  @IsString()
  @IsOptional()
  app?: string

  @IsBoolean()
  @IsOptional()
  compress?: boolean

  @IsNumber()
  @IsOptional()
  quality?: number
}

export class RequestUploadResponseDto {
  url: string
  filePath: string
  fileName: string
  uploadMethod: 'POST' | 'PUT'
  fields?: Record<string, string>
  headers?: Record<string, string>
}
