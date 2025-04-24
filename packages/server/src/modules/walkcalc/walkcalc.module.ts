import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { GroupController } from './controllers/group.controller'
import { RecordController } from './controllers/record.controller'
import { GroupSchema } from './schemas/group.schema'
import { RecordSchema } from './schemas/record.schema'
import { GroupService } from './services/group.service'
import { RecordService } from './services/record.service'

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'walkcalc-groups', schema: GroupSchema },
      { name: 'walkcalc-records', schema: RecordSchema },
    ]),
  ],
  controllers: [GroupController, RecordController],
  providers: [GroupService, RecordService],
})
export class WalkcalcModule {}
