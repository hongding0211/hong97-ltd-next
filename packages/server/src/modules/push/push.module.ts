import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { PushNotificationCatalog } from './catalog'
import { ApnsHttpClient } from './providers/apns-http-client'
import { ApnsPushProvider } from './providers/apns.provider'
import { PushController } from './push.controller'
import { PushService } from './push.service'
import { PushDevice, PushDeviceSchema } from './schema/push-device.schema'

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PushDevice.name, schema: PushDeviceSchema },
    ]),
  ],
  controllers: [PushController],
  providers: [
    PushNotificationCatalog,
    ApnsHttpClient,
    ApnsPushProvider,
    PushService,
  ],
  exports: [PushService],
})
export class PushModule {}
