import { IsString } from 'class-validator'

export class ViewDto {
  @IsString()
  blogId: string
}
