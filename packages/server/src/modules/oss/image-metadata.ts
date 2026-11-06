import { BadRequestException } from '@nestjs/common'
import { plainToInstance } from 'class-transformer'
import { validateSync } from 'class-validator'
import imagePolicy from '../../config/image-policy.json'
import { ImageMetadataDto } from './dto/request-upload'

/** Optional header keeps old upload clients and older servers compatible. */
export function parseImageMetadata(
  value?: string,
): ImageMetadataDto | undefined {
  if (value === undefined) return
  try {
    if (value.length > 512) throw new Error()
    const parsed = JSON.parse(value)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
      throw new Error()
    const meta = plainToInstance(ImageMetadataDto, parsed)
    if (
      validateSync(meta, { whitelist: true, forbidNonWhitelisted: true }).length
    )
      throw new Error()
    return meta
  } catch {
    throw new BadRequestException('Invalid image metadata')
  }
}

export function imageMetadataHeaders(
  meta?: ImageMetadataDto,
): Record<string, string> {
  if (!meta) return {}
  return Object.fromEntries(
    Object.entries(imagePolicy.metadataHeaders).map(([field, header]) => [
      header,
      String(meta[field as keyof ImageMetadataDto]),
    ]),
  )
}
