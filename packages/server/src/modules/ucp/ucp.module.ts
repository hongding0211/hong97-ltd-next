import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { UCP, UCPSchema } from './schema/ucp.schema'
import { UCPController } from './ucp.controller'
import { UCPService } from './ucp.service'

@Module({
  imports: [MongooseModule.forFeature([{ name: UCP.name, schema: UCPSchema }])],
  controllers: [UCPController],
  providers: [UCPService],
  exports: [UCPService],
})
export class UCPModule {}
