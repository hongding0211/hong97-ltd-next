import { Controller, Get, Post, Query, Body, Param } from '@nestjs/common'
import { UCPService } from './ucp.service'
import { ListDto } from './dto/list.dto'
import { RootOnly } from 'src/decorators/root-only.decorator'
import { UserId } from 'src/decorators/user-id.decorator'
import { CreateDto } from './dto/create.dto'
import { DetailDto } from './dto/detail.dto'
import { AppendDto } from './dto/append.dto'

@Controller('ucp')
export class UCPController {
  constructor(private readonly ucpService: UCPService) {}

  @Get('list')
  @RootOnly()
  async list(@Query() listDto: ListDto) {
    return this.ucpService.list(listDto)
  }

  @Post('create')
  @RootOnly()
  async create(@Body() createDto: CreateDto, @UserId() userId: string) {
    return this.ucpService.create(createDto, userId)
  }

  @Get('detail')
  @RootOnly()
  async detail(@Query() detailDto: DetailDto) {
    return this.ucpService.detail(detailDto)
  }

  @Get('/ucpDetail')
  @RootOnly()
  async listByUcpId(@Param('id') id: string) {
    return this.ucpService.listByUcpId(id)
  }

  @Post('append')
  @RootOnly()
  async append(@Body() appendDto: AppendDto) {
    return this.ucpService.append(appendDto)
  }
}
