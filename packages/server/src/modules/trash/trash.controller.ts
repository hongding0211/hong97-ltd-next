import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common'
import { RootOnly } from '../../decorators/root-only.decorator'
import { PaginationResponseDto } from '../../dtos/pagination.dto'
import { CreateTrashDto } from './dto/create-trash.dto'
import { QueryTrashDto } from './dto/query-trash.dto'
import { TrashResponseDto } from './dto/trash-response.dto'
import { TrashService } from './trash.service'

@Controller('trash')
export class TrashController {
  constructor(private readonly trashService: TrashService) {}

  @Post('create')
  @RootOnly()
  async create(
    @Body() createTrashDto: CreateTrashDto,
  ): Promise<TrashResponseDto> {
    return await this.trashService.create(createTrashDto)
  }

  @Get('list')
  async findAll(
    @Query() queryDto: QueryTrashDto,
  ): Promise<PaginationResponseDto<TrashResponseDto>> {
    return await this.trashService.findAll(queryDto)
  }

  @Get('detail/:id')
  async findById(@Param('id') id: string): Promise<TrashResponseDto> {
    const trash = await this.trashService.findById(id)
    if (!trash) {
      throw new Error('Trash not found')
    }
    return trash
  }
}
