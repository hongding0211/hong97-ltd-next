import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import {
  WalkcalcGroup,
  WalkcalcGroupSchema,
} from './schema/walkcalc-group.schema'
import { WalkcalcController } from './walkcalc.controller'
import { WalkcalcService } from './walkcalc.service'

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: WalkcalcGroup.name, schema: WalkcalcGroupSchema },
    ]),
  ],
  controllers: [WalkcalcController],
  providers: [WalkcalcService],
  exports: [WalkcalcService],
})
export class WalkcalcModule {}
