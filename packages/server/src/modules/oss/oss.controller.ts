import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common'
import { RequestUploadDto } from './dto/request-upload'
import { OssService } from './oss.service'

@Controller('oss')
export class OssController {
  constructor(private readonly ossService: OssService) {}

  @Post('requestUpload')
  @HttpCode(HttpStatus.OK)
  async requestUpload(@Body() requestUploadDto: RequestUploadDto) {
    return this.ossService.requestUpload(requestUploadDto)
  }
}
