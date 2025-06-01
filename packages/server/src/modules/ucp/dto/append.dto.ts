import { IsObject, IsString } from 'class-validator'

export class AppendDto {
  @IsString()
  id: string

  @IsObject()
  data: Record<string, any>
}
