import {
  BadRequestException,
  Injectable,
  PayloadTooLargeException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import OSS from 'ali-oss'
import dayjs from 'dayjs'
import { RequestUploadDto } from './dto/request-upload'

@Injectable()
export class OssService {
  private oss: OSS

  constructor(private readonly configService: ConfigService) {
    this.oss = new OSS({
      accessKeyId: this.configService.get('oss.accessKeyId') ?? '',
      accessKeySecret: this.configService.get('oss.accessKeySecret') ?? '',
      bucket: this.configService.get('oss.bucket'),
      region: this.configService.get('oss.region'),
    })
  }

  private genFilePath(fileName: string, app: string) {
    const safeFileName = fileName.split(/[\\/]/).pop() ?? ''
    const m = safeFileName.match(/(.+)(\.[a-zA-Z0-9]{1,10})$/)
    if (!m) {
      throw new BadRequestException('Invalid file name')
    }
    const name = `${m[1]}_${Date.now().toString(36)}${m[2]}`
    const path = `${app}/${dayjs().format('YYYYMM')}/${name}`
    return {
      name,
      path,
    }
  }

  async requestUpload(requestUploadDto: RequestUploadDto, userId?: string) {
    const {
      fileName,
      contentType,
      fileSize,
      app = 'common',
      compress = false,
      quality = 90,
    } = requestUploadDto

    this.validateApp(app, this.isRootUser(userId))

    const { path, name } = this.genFilePath(fileName, app)

    if (!this.isRootUser(userId)) {
      return this.standardUploadResponse({
        path,
        name,
        contentType: contentType || 'application/octet-stream',
        fileSize,
      })
    }

    return {
      url: this.oss
        .signatureUrl(path, {
          method: 'PUT',
          process: compress ? `image/quality,q_${quality}` : undefined,
          'Content-Type': contentType,
        })
        .replace('http', 'https'),
      filePath: this.oss.generateObjectUrl(path).replace('http', 'https'),
      fileName: name,
      uploadMethod: 'PUT' as const,
    }
  }

  private standardUploadResponse({
    path,
    name,
    contentType,
    fileSize,
  }: {
    path: string
    name: string
    contentType: string
    fileSize?: number
  }) {
    const maxBytes =
      this.configService.get<number>('oss.standardUploadMaxBytes') ??
      20 * 1024 * 1024
    if (fileSize && fileSize > maxBytes) {
      throw new PayloadTooLargeException(`File cannot exceed ${maxBytes} bytes`)
    }

    const bucket = this.configService.get<string>('oss.bucket') ?? ''
    const region = this.configService.get<string>('oss.region') ?? ''
    if (!bucket || !region) {
      throw new Error('OSS bucket and region must be configured')
    }

    const ttlSeconds =
      this.configService.get<number>('oss.uploadPolicyTtlSeconds') ?? 60
    const policy = {
      expiration: new Date(Date.now() + ttlSeconds * 1000).toISOString(),
      conditions: [
        { bucket },
        ['eq', '$key', path],
        ['eq', '$Content-Type', contentType],
        ['eq', '$success_action_status', '200'],
        ['content-length-range', 1, maxBytes],
      ],
    }
    const signature = this.oss.calculatePostSignature(policy)

    return {
      url: `https://${bucket}.${region}.aliyuncs.com`,
      filePath: this.oss.generateObjectUrl(path).replace('http', 'https'),
      fileName: name,
      uploadMethod: 'POST' as const,
      fields: {
        key: path,
        policy: signature.policy,
        OSSAccessKeyId: signature.OSSAccessKeyId,
        Signature: signature.Signature,
        'Content-Type': contentType,
        success_action_status: '200',
      },
    }
  }

  private isRootUser(userId?: string) {
    if (!userId) {
      return false
    }
    const rootUsers = this.configService.get<string[]>('auth.rootUsers') ?? []
    return rootUsers.includes(userId)
  }

  private validateApp(app: string, isRoot: boolean) {
    if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,31}$/.test(app)) {
      throw new BadRequestException('Invalid upload app')
    }
    if (!isRoot && ['blog', 'trash'].includes(app)) {
      throw new BadRequestException('Invalid upload app')
    }
  }
}
