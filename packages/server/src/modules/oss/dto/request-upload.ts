import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  Max,
} from 'class-validator'

export class ImageMetadataDto {
  @IsInt()
  @IsPositive()
  @Max(Number.MAX_SAFE_INTEGER)
  width: number

  @IsInt()
  @IsPositive()
  @Max(Number.MAX_SAFE_INTEGER)
  height: number

  @IsString()
  @Matches(/^[A-Za-z0-9_-]{7,128}$/)
  thumbHash: string
}

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
