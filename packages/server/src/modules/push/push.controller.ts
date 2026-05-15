import { Body, Controller, Delete, Param, Post } from '@nestjs/common'
import { UserId } from '../../decorators/user-id.decorator'
import { PushDeviceResponseDto } from './dto/push-device-response.dto'
import { RegisterPushDeviceDto } from './dto/register-push-device.dto'
import { PushService } from './push.service'

@Controller('push/devices')
export class PushController {
  constructor(private readonly pushService: PushService) {}

  @Post()
  async registerDevice(
    @UserId() userId: string,
    @Body() dto: RegisterPushDeviceDto,
  ) {
    const device = await this.pushService.upsertDeviceRegistration({
      ...dto,
      recipientId: userId,
    })

    return PushDeviceResponseDto.fromDocument(device)
  }

  @Delete(':deviceId')
  async disableDevice(
    @UserId() userId: string,
    @Param('deviceId') deviceId: string,
  ) {
    await this.pushService.disableDeviceForRecipient({
      recipientId: userId,
      deviceId,
      reason: 'client-disabled',
    })

    return { success: true }
  }
}
