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
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator'

export type MoneyMinor = string

const MONEY_MINOR_PATTERN = /^-?(0|[1-9]\d*)$/

export class AddWalkcalcRecordDto {
  @IsString()
  @IsNotEmpty()
  groupCode: string

  @IsString()
  @IsNotEmpty()
  who: string

  @IsOptional()
  @IsString()
  @Matches(MONEY_MINOR_PATTERN)
  paidMinor?: MoneyMinor

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  paid?: number

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

export class BulkResolveWalkcalcDebtTransferDto {
  @IsString()
  @IsNotEmpty()
  from: string

  @IsString()
  @IsNotEmpty()
  to: string

  @IsOptional()
  @IsString()
  @Matches(MONEY_MINOR_PATTERN)
  amountMinor?: MoneyMinor

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.0000000001)
  amount?: number
}

export class BulkResolveWalkcalcDebtsDto {
  @IsString()
  @IsNotEmpty()
  groupCode: string

  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => BulkResolveWalkcalcDebtTransferDto)
  transfers: BulkResolveWalkcalcDebtTransferDto[]
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

  @IsOptional()
  @IsString()
  search?: string

  @IsOptional()
  @IsString()
  participantId?: string
}
