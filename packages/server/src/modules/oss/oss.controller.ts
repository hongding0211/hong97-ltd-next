import {
  Body,
  Controller,
  ExecutionContext,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { UserId } from '../../decorators/user-id.decorator'
import { RequestUploadDto } from './dto/request-upload'
import { OssService } from './oss.service'

@Controller('oss')
export class OssController {
  constructor(private readonly ossService: OssService) {}

  @Post('requestUpload')
  @HttpCode(HttpStatus.OK)
  @Throttle({
    default: {
      limit: (context: ExecutionContext) =>
        context.switchToHttp().getRequest()?.user?.id ? 10 : 5,
      ttl: (context: ExecutionContext) =>
        context.switchToHttp().getRequest()?.user?.id ? 60_000 : 600_000,
    },
  })
  async requestUpload(
    @Body() requestUploadDto: RequestUploadDto,
    @UserId() userId?: string,
  ) {
    return this.ossService.requestUpload(requestUploadDto, userId)
  }
}
