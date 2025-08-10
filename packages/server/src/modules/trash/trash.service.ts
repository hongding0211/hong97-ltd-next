import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { PaginationResponseDto } from '../../dtos/pagination.dto'
import { CreateTrashDto } from './dto/create-trash.dto'
import { LikeTrashDto } from './dto/like-trash.dto'
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
      likeHistory: [],
    })
    const savedTrash = await trash.save()
    return this.toResponseDto(savedTrash)
  }

  async findAll(
    queryDto: QueryTrashDto,
    userId?: string,
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
      data: data.map((item) => this.toResponseDto(item, userId)),
      total,
      page,
      pageSize,
    }
  }

  async findById(
    id: string,
    userId?: string,
  ): Promise<TrashResponseDto | null> {
    const trash = await this.trashModel.findById(id).exec()
    return trash ? this.toResponseDto(trash, userId) : null
  }

  async delete(id: string): Promise<{ success: boolean }> {
    const result = await this.trashModel.findByIdAndDelete(id).exec()
    return { success: !!result }
  }

  async like(
    likeDto: LikeTrashDto,
    userId?: string,
  ): Promise<TrashResponseDto> {
    const { trashId } = likeDto

    const trash = await this.trashModel.findById(trashId)

    if (!trash) {
      throw new Error('Trash not found')
    }

    if (userId) {
      // 已登录用户：切换点赞状态
      if (trash.likeHistory.some((like) => like.userId === userId)) {
        trash.likeHistory = trash.likeHistory.filter(
          (like) => like.userId !== userId,
        )
      } else {
        trash.likeHistory.push({ userId, time: Date.now() })
      }
    } else {
      // 匿名用户：只能点赞，不能取消
      trash.likeHistory.push({ time: Date.now() })
    }

    await trash.save()
    return this.toResponseDto(trash, userId)
  }

  private toResponseDto(
    trash: TrashDocument,
    userId?: string,
  ): TrashResponseDto {
    const isLiked = userId
      ? trash.likeHistory.some((like) => like.userId === userId)
      : false

    return {
      _id: trash._id.toString(),
      content: trash.content,
      media: trash.media,
      tags: trash.tags,
      timestamp: trash.timestamp,
      likeCount: trash.likeHistory.length,
      isLiked,
      createdAt: trash.createdAt,
      updatedAt: trash.updatedAt,
    }
  }
}
