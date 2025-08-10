import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { PaginationResponseDto } from '../../dtos/pagination.dto'
import { CreateTrashDto } from './dto/create-trash.dto'
import { QueryTrashDto } from './dto/query-trash.dto'
import { TrashResponseDto } from './dto/trash-response.dto'
import { Trash, TrashDocument } from './schema/trash.schema'

@Injectable()
export class TrashService {
  constructor(
    @InjectModel(Trash.name) private trashModel: Model<TrashDocument>,
  ) {}

  async create(createTrashDto: CreateTrashDto): Promise<TrashResponseDto> {
    // Validate: must have either content or media
    const hasContent = createTrashDto.content?.trim()
    const hasMedia = createTrashDto.media && createTrashDto.media.length > 0

    if (!hasContent && !hasMedia) {
      throw new Error('Either content or media must be provided')
    }

    const trash = new this.trashModel({
      ...createTrashDto,
      timestamp: Date.now(),
    })
    const savedTrash = await trash.save()
    return this.toResponseDto(savedTrash)
  }

  async findAll(
    queryDto: QueryTrashDto,
  ): Promise<PaginationResponseDto<TrashResponseDto>> {
    const { page = 1, pageSize = 10, tags } = queryDto
    const skip = (page - 1) * pageSize

    const filter: any = {}
    if (tags && tags.length > 0) {
      filter.tags = { $in: tags }
    }

    const [data, total] = await Promise.all([
      this.trashModel
        .find(filter)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(pageSize)
        .exec(),
      this.trashModel.countDocuments(filter),
    ])

    return {
      data: data.map((item) => this.toResponseDto(item)),
      total,
      page,
      pageSize,
    }
  }

  async findById(id: string): Promise<TrashResponseDto | null> {
    const trash = await this.trashModel.findById(id).exec()
    return trash ? this.toResponseDto(trash) : null
  }

  private toResponseDto(trash: TrashDocument): TrashResponseDto {
    return {
      _id: trash._id.toString(),
      content: trash.content,
      media: trash.media,
      tags: trash.tags,
      timestamp: trash.timestamp,
      createdAt: trash.createdAt,
      updatedAt: trash.updatedAt,
    }
  }
}
