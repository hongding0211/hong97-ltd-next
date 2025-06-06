import { IsObject, IsOptional, IsString } from 'class-validator'

export class EditConfigItemDto {
  @IsString()
  ucpId: string

  @IsString()
  itemId: string

  @IsObject()
  @IsOptional()
  data?: Record<string, any>
}
