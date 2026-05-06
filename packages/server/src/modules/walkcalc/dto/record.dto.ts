import { Type } from 'class-transformer'
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator'

export class AddWalkcalcRecordDto {
  @IsString()
  @IsNotEmpty()
  groupCode: string

  @IsString()
  @IsNotEmpty()
  who: string

  @Type(() => Number)
  @IsNumber()
  paid: number

  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(200)
  @IsString({ each: true })
  forWhom: string[]

  @IsOptional()
  @IsString()
  type?: string

  @IsOptional()
  @IsString()
  text?: string

  @IsOptional()
  @IsString()
  long?: string

  @IsOptional()
  @IsString()
  lat?: string

  @IsOptional()
  @IsBoolean()
  isDebtResolve?: boolean
}

export class DropWalkcalcRecordDto {
  @IsString()
  @IsNotEmpty()
  groupCode: string

  @IsString()
  @IsNotEmpty()
  recordId: string
}

export class UpdateWalkcalcRecordDto extends AddWalkcalcRecordDto {
  @IsString()
  @IsNotEmpty()
  recordId: string
}

export class QueryWalkcalcRecordsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 10
}
