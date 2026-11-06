import { BadRequestException, PayloadTooLargeException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { imageMetadataHeaders, parseImageMetadata } from './image-metadata'
import { OssService } from './oss.service'

const config = {
  'oss.accessKeyId': 'test-access-key-id',
  'oss.accessKeySecret': 'test-access-key-secret',
  'oss.bucket': 'ltd-hong97-imgs',
  'oss.region': 'oss-cn-shanghai',
  'oss.standardUploadMaxBytes': 20 * 1024 * 1024,
  'oss.uploadPolicyTtlSeconds': 60,
  'auth.rootUsers': ['root-user'],
}

describe('OssService', () => {
  const configService = {
    get: jest.fn((key: keyof typeof config) => config[key]),
  } as unknown as ConfigService
  const service = new OssService(configService)

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-08-14T12:00:00Z'))
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('returns an OSS-enforced POST policy for a standard upload', async () => {
    const result = await service.requestUpload({
      fileName: 'avatar.png',
      fileSize: 1024,
      contentType: 'image/png',
      app: 'sso',
    })

    expect(result.uploadMethod).toBe('POST')
    if (result.uploadMethod !== 'POST') {
      throw new Error('Expected a POST upload response')
    }
    expect(result.url).toBe(
      'https://ltd-hong97-imgs.oss-cn-shanghai.aliyuncs.com',
    )
    expect(result.filePath).toContain('/sso/202608/avatar_')
    expect(result.fields?.key).toMatch(/^sso\/202608\/avatar_[^.]+\.png$/)
    expect(result.fields?.['Content-Type']).toBe('image/png')
    expect(result.fields?.['Cache-Control']).toBe(
      'public, max-age=31536000, immutable',
    )

    const policy = JSON.parse(
      Buffer.from(result.fields?.policy ?? '', 'base64').toString('utf8'),
    )
    expect(policy.conditions).toContainEqual([
      'content-length-range',
      1,
      20 * 1024 * 1024,
    ])
    expect(policy.conditions).toContainEqual(['eq', '$key', result.fields?.key])
    expect(policy.conditions).toContainEqual([
      'eq',
      '$Cache-Control',
      'public, max-age=31536000, immutable',
    ])
  })

  it('rejects an oversized standard upload before signing', async () => {
    await expect(
      service.requestUpload({
        fileName: 'large.bin',
        fileSize: 20 * 1024 * 1024 + 1,
        app: 'uploader',
      }),
    ).rejects.toBeInstanceOf(PayloadTooLargeException)
  })

  it('keeps root uploads on presigned PUT', async () => {
    const result = await service.requestUpload(
      {
        fileName: 'cover.webp',
        contentType: 'application/octet-stream',
        app: 'blog',
      },
      'root-user',
    )

    expect(result.uploadMethod).toBe('PUT')
    if (result.uploadMethod !== 'PUT') {
      throw new Error('Expected a PUT upload response')
    }
    expect('fields' in result).toBe(false)
    expect(result.headers).toEqual({
      'Content-Type': 'application/octet-stream',
      'Cache-Control': 'public, max-age=31536000, immutable',
    })
    expect(result.filePath).toContain('/blog/202608/cover_')
  })

  it('prevents standard callers from signing root-only app paths', async () => {
    await expect(
      service.requestUpload({ fileName: 'post.webp', app: 'blog' }),
    ).rejects.toBeInstanceOf(BadRequestException)
  })

  it('signs image metadata headers into root PUT uploads', async () => {
    const metadata = {
      width: 1200,
      height: 800,
      thumbHash: 'GPiBC4IOM2AFmwQ22DAOHGCGg3aotog',
    }
    const body = {
      fileName: 'cover.webp',
      contentType: 'image/webp',
      app: 'blog',
    }
    const withMeta = await service.requestUpload(body, 'root-user', metadata)
    const legacy = await service.requestUpload(body, 'root-user')
    if (withMeta.uploadMethod !== 'PUT') throw new Error('Expected PUT')
    expect(withMeta.headers).toMatchObject(imageMetadataHeaders(metadata))
    expect(new URL(withMeta.url).searchParams.get('Signature')).not.toBe(
      new URL(legacy.url).searchParams.get('Signature'),
    )
  })

  it('enforces every image metadata field in the standard POST policy', async () => {
    const metadata = {
      width: 48,
      height: 48,
      thumbHash: 'GPiBC4IOM2AFmwQ22DAOHGCGg3aotog',
    }
    const result = await service.requestUpload(
      { fileName: 'avatar.webp', app: 'sso', contentType: 'image/webp' },
      'standard',
      metadata,
    )
    if (result.uploadMethod !== 'POST') throw new Error('Expected POST')
    expect(result.fields).toMatchObject(imageMetadataHeaders(metadata))
    const policy = JSON.parse(
      Buffer.from(result.fields?.policy ?? '', 'base64').toString(),
    )
    for (const [key, value] of Object.entries(imageMetadataHeaders(metadata)))
      expect(policy.conditions).toContainEqual(['eq', `$${key}`, value])
  })

  it('validates optional image metadata without weakening legacy upload validation', () => {
    const metadata = {
      width: 600,
      height: 400,
      thumbHash: 'GPiBC4IOM2AFmwQ22DAOHGCGg3aotog',
    }
    expect(parseImageMetadata()).toBeUndefined()
    expect(parseImageMetadata(JSON.stringify(metadata))).toEqual(metadata)
    for (const invalid of [
      'null',
      '[]',
      '{}',
      '{',
      JSON.stringify({ ...metadata, width: 0 }),
      JSON.stringify({ ...metadata, height: '400' }),
      JSON.stringify({ ...metadata, thumbHash: 'bad' }),
      JSON.stringify({ ...metadata, arbitraryHeader: 'no' }),
    ])
      expect(() => parseImageMetadata(invalid)).toThrow(BadRequestException)
  })
})
