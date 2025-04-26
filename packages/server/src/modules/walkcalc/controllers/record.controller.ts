import { createHash } from 'crypto'
import { Body, Controller, Get, Post, Query } from '@nestjs/common'
import { UserId } from 'src/decorators/user-id.decorator'
import { RecordService } from '../services/record.service'

interface RecordDto {
  groupId: string
  who: string
  paid: number
  forWhom: Array<{ userId: string; amount: number }>
  type?: string
  text?: string
  long?: string
  lat?: string
  isDebtResolve?: boolean
}

@Controller('walkcalc/record')
export class RecordController {
  constructor(private readonly recordService: RecordService) {}

  @Post('add')
  async add(@Body() body: RecordDto, @UserId() userId: string) {
    const recordId = createHash('sha256')
      .update(`${body.groupId}${Date.now()}`)
      .digest('hex')

    const result = await this.recordService.add({
      ...body,
      recordId,
      creatorId: userId,
    })

    if (result.modifiedCount > 0) {
      return {
        ...body,
        recordId,
      }
    }
    throw new Error('Add failed.')
  }

  @Post('drop')
  async drop(
    @Body() body: { groupId: string; recordId: string },
    @UserId() userId: string,
  ) {
    const { groupId, recordId } = body
    const _result = await this.recordService.drop(groupId, recordId, userId)
    // if (result.modifiedCount > 0) {
    //   return {
    //     groupId,
    //     recordId,
    //   }
    // }
    throw new Error('Drop failed.')
  }

  @Post('update')
  async update(
    @Body() body: RecordDto & { recordId: string },
    @UserId() userId: string,
  ) {
    const result = await this.recordService.update({
      ...body,
      creatorId: userId,
    })
    if (result.modifiedCount > 0) {
      return body
    }
    throw new Error('Update failed.')
  }

  @Get('detail')
  async getById(@Query('id') id: string) {
    const records = await this.recordService.getById(id)
    if (records.length > 0) {
      return records[0]
    }
    throw new Error('Query failed')
  }

  @Get('group')
  async getByGroupId(@Query('id') id: string) {
    return this.recordService.getByGroupId(id)
  }
}
