import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { Trash, TrashSchema } from './schema/trash.schema'
import { TrashController } from './trash.controller'
import { TrashService } from './trash.service'

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Trash.name, schema: TrashSchema }]),
  ],
  controllers: [TrashController],
  providers: [TrashService],
  exports: [TrashService],
})
export class TrashModule {}
