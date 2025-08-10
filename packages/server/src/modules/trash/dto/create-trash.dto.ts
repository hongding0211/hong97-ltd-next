import { Type } from 'class-transformer'
import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  ValidateNested,
} from 'class-validator'

export class LivePhotoMediaDto {
  @IsNotEmpty()
  @IsUrl()
  imageUrl: string

  @IsOptional()
  @IsUrl()
  videoUrl?: string
}

export class CreateTrashDto {
  @IsOptional()
  @IsString()
  content?: string

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LivePhotoMediaDto)
  media?: LivePhotoMediaDto[]

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[]
}
