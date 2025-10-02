import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { GeneralException } from 'src/exceptions/general-exceptions'
import { v4 as uuidv4 } from 'uuid'
import { CreateShortLinkDto } from './dto/create-shortlink.dto'
import { QueryShortLinkDto } from './dto/query-shortlink.dto'
import { RedirectShortLinkDto } from './dto/redirect-shortlink.dto'
import {
  ShortLinkListResponseDto,
  ShortLinkResponseDto,
} from './dto/shortlink-response.dto'
import { UpdateShortLinkDto } from './dto/update-shortlink.dto'
import { ShortLink, ShortLinkDocument } from './schema/shortlink.schema'

@Injectable()
export class ShortLinkService {
  constructor(
    @InjectModel(ShortLink.name)
    private shortLinkModel: Model<ShortLinkDocument>,
  ) {}

  private generateShortCode(): string {
    // 生成6位随机小写字母字符串 (a-z)
    // 使用crypto.getRandomValues()获得更好的随机性
    const chars = 'abcdefghijklmnopqrstuvwxyz'
    const array = new Uint8Array(6)
    crypto.getRandomValues(array)

    let result = ''
    for (let i = 0; i < 6; i++) {
      result += chars[array[i] % chars.length]
    }
    return result
  }

  private async generateUniqueShortCode(): Promise<string> {
    const maxAttempts = 10 // 最大尝试次数，避免无限循环
    let attempts = 0

    while (attempts < maxAttempts) {
      const shortCode = this.generateShortCode()
      const existing = await this.shortLinkModel.findOne({ shortCode })
      if (!existing) {
        return shortCode
      }
      attempts++
    }

    // 如果10次尝试后仍有冲突，使用UUID作为后备方案
    // 但需要转换为6位小写字母格式
    const uuid = uuidv4().replace(/-/g, '')
    const chars = 'abcdefghijklmnopqrstuvwxyz'
    let result = ''
    for (let i = 0; i < 6; i++) {
      const charCode = parseInt(uuid.substr(i * 2, 2), 16)
      result += chars[charCode % chars.length]
    }

    return result
  }

  async create(
    createDto: CreateShortLinkDto,
    userId: string,
  ): Promise<ShortLinkResponseDto> {
    const {
      originalUrl,
      title,
      description,
      shortCode,
      tags = [],
      expiresAt,
      isActive = true,
    } = createDto

    // 如果用户提供了自定义短码，检查是否已存在
    let finalShortCode = shortCode
    if (shortCode) {
      const existing = await this.shortLinkModel.findOne({ shortCode })
      if (existing) {
        throw new ConflictException('Short code already exists')
      }
    } else {
      finalShortCode = await this.generateUniqueShortCode()
    }

    const shortLink = new this.shortLinkModel({
      shortCode: finalShortCode,
      originalUrl,
      title,
      description,
      clickCount: 0,
      isActive,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      createdBy: userId,
      tags,
    })

    await shortLink.save()

    return this.mapToResponseDto(shortLink)
  }

  async update(
    id: string,
    updateDto: UpdateShortLinkDto,
    userId: string,
  ): Promise<ShortLinkResponseDto> {
    const shortLink = await this.shortLinkModel.findById(id)

    if (!shortLink) {
      throw new NotFoundException('Short link not found')
    }

    // 检查权限：只有创建者可以修改
    if (shortLink.createdBy !== userId) {
      throw new GeneralException('shortlink.unauthorized' as any)
    }

    // 更新字段
    Object.assign(shortLink, {
      ...updateDto,
      expiresAt: updateDto.expiresAt
        ? new Date(updateDto.expiresAt)
        : shortLink.expiresAt,
    })

    await shortLink.save()

    return this.mapToResponseDto(shortLink)
  }

  async delete(id: string, userId: string): Promise<void> {
    const shortLink = await this.shortLinkModel.findById(id)

    if (!shortLink) {
      throw new NotFoundException('Short link not found')
    }

    // 检查权限：只有创建者可以删除
    if (shortLink.createdBy !== userId) {
      throw new GeneralException('shortlink.unauthorized' as any)
    }

    await this.shortLinkModel.findByIdAndDelete(id)
  }

  async findAll(
    queryDto: QueryShortLinkDto,
    userId: string,
  ): Promise<ShortLinkListResponseDto> {
    const { page = 1, pageSize = 10, search, tag } = queryDto

    // 构建查询条件
    const filter: any = { createdBy: userId }

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { originalUrl: { $regex: search, $options: 'i' } },
        { shortCode: { $regex: search, $options: 'i' } },
      ]
    }

    if (tag) {
      filter.tags = { $in: [tag] }
    }

    // 计算总数
    const total = await this.shortLinkModel.countDocuments(filter)

    // 查询数据
    const shortLinks = await this.shortLinkModel
      .find(filter)
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .sort({ createdAt: -1 })

    const data = shortLinks.map((link) => this.mapToResponseDto(link))
    const totalPages = Math.ceil(total / pageSize)

    return {
      data,
      total,
      page,
      pageSize,
      totalPages,
    }
  }

  async findOne(id: string, userId: string): Promise<ShortLinkResponseDto> {
    const shortLink = await this.shortLinkModel.findById(id)

    if (!shortLink) {
      throw new NotFoundException('Short link not found')
    }

    // 检查权限：只有创建者可以查看详情
    if (shortLink.createdBy !== userId) {
      throw new GeneralException('shortlink.unauthorized' as any)
    }

    return this.mapToResponseDto(shortLink)
  }

  async redirect(redirectDto: RedirectShortLinkDto): Promise<string> {
    const { shortCode } = redirectDto

    const shortLink = await this.shortLinkModel.findOne({ shortCode })

    if (!shortLink) {
      throw new NotFoundException('Short link not found')
    }

    // 检查是否激活
    if (!shortLink.isActive) {
      throw new GeneralException('shortlink.inactive' as any)
    }

    // 检查是否过期
    if (shortLink.expiresAt && new Date() > shortLink.expiresAt) {
      throw new GeneralException('shortlink.expired' as any)
    }

    // 增加点击次数
    shortLink.clickCount += 1
    await shortLink.save()

    return shortLink.originalUrl
  }

  private mapToResponseDto(shortLink: ShortLinkDocument): ShortLinkResponseDto {
    return {
      id: (shortLink._id as any).toString(),
      shortCode: shortLink.shortCode,
      originalUrl: shortLink.originalUrl,
      title: shortLink.title,
      description: shortLink.description,
      clickCount: shortLink.clickCount,
      isActive: shortLink.isActive,
      expiresAt: shortLink.expiresAt,
      createdBy: shortLink.createdBy,
      tags: shortLink.tags,
      createdAt: (shortLink as any).createdAt,
      updatedAt: (shortLink as any).updatedAt,
    }
  }
}
