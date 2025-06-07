import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common'
import { RootOnly } from 'src/decorators/root-only.decorator'
import { UserId } from 'src/decorators/user-id.decorator'
import { AppendDto } from './dto/append.dto'
import { ConfigListDto } from './dto/config-list'
import { CreateDto } from './dto/create.dto'
import { DetailDto } from './dto/detail.dto'
import { EditConfigItemDto } from './dto/editConfigItem'
import { ListDto } from './dto/list.dto'
import { UCPService } from './ucp.service'

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

  @Get('/config/list')
  async listByUcpId(@Query() query: ConfigListDto, @UserId() userId: string) {
    return this.ucpService.configList(query, userId)
  }

  @Get('/config/all')
  async listAll(@Param('id') id: string, @UserId() userId: string) {
    return this.ucpService.listAll(id, userId)
  }

  @Post('/config/append')
  @RootOnly()
  async append(@Body() appendDto: AppendDto) {
    return this.ucpService.append(appendDto)
  }

  @Put('/config/update')
  @RootOnly()
  async update(@Body() updateDto: EditConfigItemDto) {
    return this.ucpService.update(updateDto)
  }

  @Delete('/config')
  @RootOnly()
  async delete(@Query() query: EditConfigItemDto) {
    return this.ucpService.deleteConfig(query)
  }
}
