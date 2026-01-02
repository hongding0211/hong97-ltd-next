import { Global, Module } from '@nestjs/common'
import { BarkService } from './bark.service'

@Global()
@Module({
  providers: [BarkService],
  exports: [BarkService],
})
export class BarkModule {}
