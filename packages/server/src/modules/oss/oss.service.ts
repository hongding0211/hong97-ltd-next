import { BadRequestException, Injectable } from '@nestjs/common'
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
    const m = fileName.match(/(.+)(\.\w+)/)
    if (!m) {
      throw new BadRequestException('Invalid file name')
    }
    const name = `${m[1]}_${Date.now().toString(36)}${m[2]}`
    const path = `/${app}/${dayjs().format('YYYYMM')}/${name}`
    return {
      name,
      path,
    }
  }

  async requestUpload(requestUploadDto: RequestUploadDto) {
    const {
      fileName,
      contentType,
      app = 'common',
      compress = false,
      quality = 90,
    } = requestUploadDto

    if (!fileName.match(/(.+)(\.\w+)/)) {
      throw new BadRequestException('Invalid file name')
    }

    const { path, name } = this.genFilePath(fileName, app)

    return {
      url: this.oss.signatureUrl(path, {
        method: 'PUT',
        process: compress ? `image/quality,q_${quality}` : undefined,
        'Content-Type': contentType,
      }),
      filePath: this.oss.generateObjectUrl(path),
      fileName: name,
    }
  }
}
