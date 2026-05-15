import { Type } from 'class-transformer'
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator'

const MONEY_AMOUNT_PATTERN = /^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/

export class AddWalkcalcRecordDto {
  @IsString()
  @IsNotEmpty()
  groupCode: string

  @IsString()
  @IsIn(['expense', 'settlement'])
  type: 'expense' | 'settlement'

  @IsString()
  @Matches(MONEY_AMOUNT_PATTERN)
  amount: string

  @IsOptional()
  @IsString()
  payerId?: string

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(200)
  @IsString({ each: true })
  participantIds?: string[]

  @IsOptional()
  @IsString()
  fromId?: string

  @IsOptional()
  @IsString()
  toId?: string

  @IsOptional()
  @IsString()
  category?: string

  @IsOptional()
  @IsString()
  note?: string

  @IsOptional()
  @IsString()
  long?: string

  @IsOptional()
  @IsString()
  lat?: string

  @Type(() => Number)
  @IsInt()
  @Min(0)
  occurredAt: number
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

export class ResolveWalkcalcSettlementsDto {
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  transfers?: Array<{
    fromId: string
    toId: string
    amount: string
  }>
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

  @IsOptional()
  @IsString()
  search?: string

  @IsOptional()
  @IsString()
  participantId?: string
}
