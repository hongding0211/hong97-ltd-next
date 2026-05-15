import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { PushModule } from '../push/push.module'
import {
  WalkcalcGroup,
  WalkcalcGroupSchema,
  WalkcalcParticipant,
  WalkcalcParticipantProjection,
  WalkcalcParticipantProjectionSchema,
  WalkcalcParticipantSchema,
  WalkcalcRecord,
  WalkcalcRecordSchema,
} from './schema/walkcalc-group.schema'
import { WalkcalcPushService } from './walkcalc-push.service'
import { WalkcalcController } from './walkcalc.controller'
import { WalkcalcService } from './walkcalc.service'

@Module({
  imports: [
    PushModule,
    MongooseModule.forFeature([
      { name: WalkcalcGroup.name, schema: WalkcalcGroupSchema },
      { name: WalkcalcParticipant.name, schema: WalkcalcParticipantSchema },
      { name: WalkcalcRecord.name, schema: WalkcalcRecordSchema },
      {
        name: WalkcalcParticipantProjection.name,
        schema: WalkcalcParticipantProjectionSchema,
      },
    ]),
  ],
  controllers: [WalkcalcController],
  providers: [WalkcalcService, WalkcalcPushService],
  exports: [WalkcalcService],
})
export class WalkcalcModule {}
