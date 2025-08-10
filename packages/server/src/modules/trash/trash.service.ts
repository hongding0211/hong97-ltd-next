import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { MockNames } from 'src/common/assets/mock-names'
import { GeneralException } from 'src/exceptions/general-exceptions'
import { v4 as uuidv4 } from 'uuid'
import { PaginationResponseDto } from '../../dtos/pagination.dto'
import { UserService } from '../user/user.service'
import { CommentTrashDto } from './dto/comment-trash.dto'
import { CreateTrashDto } from './dto/create-trash.dto'
import { DeleteCommentDto } from './dto/delete-comment.dto'
import { LikeTrashDto } from './dto/like-trash.dto'
import { QueryTrashDto } from './dto/query-trash.dto'
import { TrashResponseDto } from './dto/trash-response.dto'
import { Trash, TrashDocument } from './schema/trash.schema'

@Injectable()
export class TrashService {
  constructor(
    @InjectModel(Trash.name) private trashModel: Model<TrashDocument>,
    private userService: UserService,
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
      comments: [],
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
      throw new GeneralException('trash.trashNotFound')
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

  async comment(
    commentDto: CommentTrashDto,
    userId?: string,
  ): Promise<TrashResponseDto> {
    const { trashId, content, anonymous } = commentDto

    const trash = await this.trashModel.findById(trashId)

    if (!trash) {
      throw new GeneralException('trash.trashNotFound')
    }

    if (trash.comments.length >= 50) {
      throw new GeneralException('trash.commentLimitReached')
    }

    const commentId = uuidv4()

    const name = await (async () => {
      const randomIndex = Date.now() % MockNames.length
      const mockName = MockNames[randomIndex]
      if (anonymous || !userId) {
        return mockName
      }
      if (userId) {
        const user = await this.userService.findUserById(userId)
        return user.profile.name
      }
      return mockName
    })()

    const comment = {
      commentId,
      userId: anonymous ? undefined : userId,
      anonymous: !!anonymous,
      name,
      time: Date.now(),
      content,
    }

    trash.comments.push(comment)
    await trash.save()

    return this.toResponseDto(trash, userId)
  }

  async deleteComment(
    deleteCommentDto: DeleteCommentDto,
    userId?: string,
  ): Promise<TrashResponseDto> {
    const { trashId, commentId } = deleteCommentDto

    const trash = await this.trashModel.findById(trashId)

    if (!trash) {
      throw new GeneralException('trash.trashNotFound')
    }

    const commentIndex = trash.comments.findIndex(
      (c) => c.commentId === commentId,
    )

    if (commentIndex === -1) {
      throw new GeneralException('trash.commentNotFound')
    }

    const comment = trash.comments[commentIndex]

    // 只有评论作者可以删除自己的评论
    if (comment.userId !== userId) {
      throw new GeneralException('trash.commentNotAuthor')
    }

    trash.comments.splice(commentIndex, 1)
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
      comments: trash.comments.map((comment) => ({
        commentId: comment.commentId || '',
        userId: comment.userId,
        anonymous: comment.anonymous,
        name: comment.name,
        time: comment.time,
        content: comment.content,
      })),
      createdAt: trash.createdAt,
      updatedAt: trash.updatedAt,
    }
  }
}
