import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common'
import { UserId } from 'src/decorators/user-id.decorator'
import { CreateShortLinkDto } from './dto/create-shortlink.dto'
import { QueryShortLinkDto } from './dto/query-shortlink.dto'
import {
  ShortLinkListResponseDto,
  ShortLinkResponseDto,
} from './dto/shortlink-response.dto'
import { UpdateShortLinkDto } from './dto/update-shortlink.dto'
import { ShortLinkService } from './shortlink.service'

@Controller('shortlink')
export class ShortLinkController {
  constructor(private readonly shortLinkService: ShortLinkService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createDto: CreateShortLinkDto,
    @UserId() userId: string,
  ): Promise<ShortLinkResponseDto> {
    return this.shortLinkService.create(createDto, userId)
  }

  @Get()
  async findAll(
    @Query() queryDto: QueryShortLinkDto,
    @UserId() userId: string,
  ): Promise<ShortLinkListResponseDto> {
    return this.shortLinkService.findAll(queryDto, userId)
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @UserId() userId: string,
  ): Promise<ShortLinkResponseDto> {
    return this.shortLinkService.findOne(id, userId)
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateShortLinkDto,
    @UserId() userId: string,
  ): Promise<ShortLinkResponseDto> {
    return this.shortLinkService.update(id, updateDto, userId)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('id') id: string,
    @UserId() userId: string,
  ): Promise<void> {
    return this.shortLinkService.delete(id, userId)
  }

  @Get('redirect/:shortCode')
  async redirect(
    @Param('shortCode') shortCode: string,
  ): Promise<{ url: string }> {
    const url = await this.shortLinkService.redirect({ shortCode })
    return { url }
  }
}
