import { IsString } from 'class-validator'

export class RedirectShortLinkDto {
  @IsString()
  shortCode: string
}
