import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { ShortLink, ShortLinkSchema } from './schema/shortlink.schema'
import { ShortLinkController } from './shortlink.controller'
import { ShortLinkService } from './shortlink.service'

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ShortLink.name, schema: ShortLinkSchema },
    ]),
  ],
  controllers: [ShortLinkController],
  providers: [ShortLinkService],
  exports: [ShortLinkService],
})
export class ShortLinkModule {}
