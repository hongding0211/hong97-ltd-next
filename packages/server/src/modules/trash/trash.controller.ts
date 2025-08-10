import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common'
import { RootOnly } from '../../decorators/root-only.decorator'
import { UserId } from '../../decorators/user-id.decorator'
import { PaginationResponseDto } from '../../dtos/pagination.dto'
import { CreateTrashDto } from './dto/create-trash.dto'
import { LikeTrashDto } from './dto/like-trash.dto'
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
    @UserId() userId?: string,
  ): Promise<PaginationResponseDto<TrashResponseDto>> {
    return await this.trashService.findAll(queryDto, userId)
  }

  @Get('detail/:id')
  async findById(
    @Param('id') id: string,
    @UserId() userId?: string,
  ): Promise<TrashResponseDto> {
    const trash = await this.trashService.findById(id, userId)
    if (!trash) {
      throw new Error('Trash not found')
    }
    return trash
  }

  @Delete(':id')
  @RootOnly()
  async delete(@Param('id') id: string): Promise<{ success: boolean }> {
    return await this.trashService.delete(id)
  }

  @Post('like')
  @HttpCode(HttpStatus.OK)
  async like(@Body() likeDto: LikeTrashDto, @UserId() userId?: string) {
    return await this.trashService.like(likeDto, userId)
  }
}
