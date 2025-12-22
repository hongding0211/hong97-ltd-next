import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import dayjs from 'dayjs'
import { Model } from 'mongoose'
import pinyin from 'pinyin'
import { MockNames } from 'src/common/assets/mock-names'
import { GeneralException } from 'src/exceptions/general-exceptions'
import { v4 as uuidv4 } from 'uuid'
import { AuthService } from '../auth/auth.service'
import { UserService } from '../user/user.service'
import {
  BlogDto,
  BlogNew2Dto,
  BlogResponseDto,
  BlogsDto,
  BlogsResponseDto,
} from './dto/blog.dto'
import { CommentDto, CommentsDto, CommentsResponseDto } from './dto/comment.dto'
import { GetContentDto, PostContentDto } from './dto/content.dto'
import { DeleteCommentDto } from './dto/deleteComment.dto'
import { MetaDto, MetaResponseDto, UpdateMetaDto } from './dto/meta.dto'
import { ViewDto } from './dto/view.dto'
import { Blog, BlogDocument } from './schema/blog.schema'

@Injectable()
export class BlogService {
  constructor(
    @InjectModel(Blog.name) private blogModel: Model<BlogDocument>,
    private userService: UserService,
    private authService: AuthService,
  ) {}

  private async createBlog(meta: {
    blogId: string
    blogTitle: string
    coverImg?: string
    keywords?: string[]
    authRequired?: boolean
  }) {
    const { blogId, blogTitle, coverImg, keywords = [], authRequired } = meta
    const blog = new this.blogModel({
      blogId,
      title: blogTitle,
      viewHistory: [],
      likeHistory: [],
      comments: [],
      keywords,
      coverImg,
      time: Date.now(),
      authRequired,
    })
    await blog.save()
    return blog
  }

  async view(viewDto: ViewDto, userId?: string) {
    const { blogId } = viewDto

    const blog = await this.blogModel.findOne({ blogId })

    if (!blog) {
      throw new GeneralException('blog.blogNotFound')
    }

    blog.viewHistory.push({ userId, time: Date.now() })

    await blog.save()

    return blog
  }

  async meta(metaDto: MetaDto, userId?: string): Promise<MetaResponseDto> {
    const { blogId } = metaDto

    const blog = await this.blogModel.findOne({ blogId })

    if (!blog) {
      throw new GeneralException('blog.blogNotFound')
    }

    const isLiked = userId
      ? blog.likeHistory.some((like) => like.userId === userId)
      : false

    const isAdmin = await this.authService.isAdmin(userId || '-1')

    return {
      blogId,
      blogTitle: blog.title,
      viewCount: blog.viewHistory.length,
      likeCount: blog.likeHistory.length,
      isLiked,
      time: blog.time,
      coverImg: blog.coverImg,
      keywords: blog.keywords ?? [],
      authRequired: blog.authRequired,
      shortCode: blog.shortCode,
      hasPublished: isAdmin ? blog.hasPublished : undefined,
      hidden2Public: isAdmin ? blog.hidden2Public : undefined,
      lastUpdateAt: blog.lastUpdateTime,
    }
  }

  async like(likeDto: MetaDto, userId?: string) {
    const { blogId } = likeDto

    const blog = await this.blogModel.findOne({ blogId })

    if (!blog) {
      throw new GeneralException('blog.blogNotFound')
    }

    if (userId) {
      if (blog.likeHistory.some((like) => like.userId === userId)) {
        blog.likeHistory = blog.likeHistory.filter(
          (like) => like.userId !== userId,
        )
      } else {
        blog.likeHistory.push({ userId, time: Date.now() })
      }
    } else {
      blog.likeHistory.push({ time: Date.now() })
    }

    await blog.save()

    return this.meta(likeDto, userId)
  }

  async comment(commentDto: CommentDto, userId?: string) {
    const { content, anonymous, blogId } = commentDto

    if (content.length > 500) {
      throw new GeneralException('blog.commentTooLong')
    }

    const blog = await this.blogModel.findOne({ blogId })

    if (!blog) {
      throw new GeneralException('blog.blogNotFound')
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

    blog.comments.push({
      commentId,
      userId: anonymous ? undefined : userId,
      anonymous: !!anonymous,
      name,
      content,
      time: Date.now(),
    })

    await blog.save()

    return blog
  }

  async comments(commentsDto: CommentsDto) {
    const { blogId } = commentsDto

    const blog = await this.blogModel.findOne({ blogId })

    if (!blog) {
      throw new GeneralException('blog.blogNotFound')
    }

    const _comments = blog.comments ?? []

    const res: CommentsResponseDto['comments'] = []

    const users = await this.userService.findUsersByIds(
      _comments.filter((c) => c.userId).map((c) => c.userId!),
    )

    for (let i = _comments.length - 1; i >= 0; i--) {
      const elem = _comments[i]
      const user = (() => {
        if (elem.userId) {
          const user = users.find((u) => u.userId === elem.userId)
          return user
        }
        return undefined
      })()
      res.push({
        ...elem,
        user,
      })
    }

    return {
      comments: res,
    }
  }

  async new(blogDto: BlogDto): Promise<BlogResponseDto> {
    const { title, keywords, coverImg } = blogDto

    let key = ''
    const timestamp = Date.now()
    if (/^[a-zA-Z\s]+$/.test(title)) {
      // english title
      key = title.toLowerCase().replace(/\s+/g, '-') + '-' + timestamp
    } else {
      // chinese title
      const pyArr = pinyin(title, { style: pinyin.STYLE_NORMAL })
      key =
        pyArr.flat().join('-').toLowerCase().replace(/\s+/g, '-') +
        '-' +
        timestamp
    }

    const blog = await this.createBlog({
      blogId: key,
      blogTitle: title,
      coverImg,
      keywords,
    })

    return {
      key,
      title,
      time: blog.time,
      keywords,
      coverImg,
    }
  }

  async new2(body?: BlogNew2Dto): Promise<BlogResponseDto> {
    const title = body?.title ?? dayjs().format('YYYY-MM-DD HH:mm:ss')
    const coverImg = body?.coverImg
    const keywords = body?.keywords ?? []
    const blog = new this.blogModel({
      blogId: uuidv4(),
      title,
      viewHistory: [],
      likeHistory: [],
      comments: [],
      keywords,
      coverImg,
      time: Date.now(),
      hasPublished: false,
      hidden2Public: false,
      lastUpdateTime: Date.now(),
    })
    await blog.save()
    return {
      key: blog.blogId,
      title,
      time: blog.time,
      keywords,
      coverImg,
    }
  }

  async list(blogsDto: BlogsDto, userId?: string): Promise<BlogsResponseDto> {
    const { page = 1, pageSize = 10, search } = blogsDto

    const isAdmin = await this.authService.isAdmin(userId || '-1')

    // Build search query
    const searchQuery = search
      ? {
          $or: [
            { title: { $regex: search, $options: 'i' } },
            { keywords: { $in: [new RegExp(search, 'i')] } },
          ],
        }
      : {}

    const visibilityQuery = isAdmin
      ? {} // Admin can see all blogs
      : {
          hasPublished: true,
          $or: [
            { hidden2Public: { $exists: false } },
            { hidden2Public: false },
          ],
        }

    const query = {
      $and: [searchQuery, visibilityQuery].filter(
        (q) => Object.keys(q).length > 0,
      ),
    }

    const total = await this.blogModel.countDocuments(query)

    const blogs = await this.blogModel
      .find(query)
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .sort({ time: -1 })

    return {
      data: blogs.map((e) => ({
        key: e.blogId,
        title: e.title,
        coverImg: e.coverImg,
        keywords: e.keywords,
        time: e.time,
        authRequired: e.authRequired,
        hasPublished: isAdmin ? e.hasPublished : undefined,
        hidden2Public: isAdmin ? e.hidden2Public : undefined,
      })),
      total,
      page,
      pageSize,
    }
  }

  async deleteComment(deleteCommentDto: DeleteCommentDto, userId?: string) {
    const { commentId, blogId } = deleteCommentDto

    const blog = await this.blogModel.findOne({ blogId })

    if (!blog) {
      throw new GeneralException('blog.blogNotFound')
    }

    const comment = blog.comments.find((c) => c.commentId === commentId)

    if (!comment) {
      throw new GeneralException('blog.commentNotFound')
    }

    if (comment.userId !== userId) {
      throw new GeneralException('blog.commentNotAuthor')
    }

    blog.comments = blog.comments.filter((c) => c.commentId !== commentId)

    await blog.save()

    return {
      commentId,
      blogId,
    }
  }

  async updateMeta(metaDto: UpdateMetaDto) {
    const { blogId, ...updateFields } = metaDto

    // 过滤掉 undefined 和 null 的字段
    const cleanedFields = Object.entries(updateFields).reduce(
      (acc, [key, value]) => {
        if (value !== undefined && value !== null) {
          acc[key] = value
        }
        return acc
      },
      {} as Record<string, any>,
    )

    const blog = await this.blogModel.findOneAndUpdate(
      { blogId },
      {
        $set: {
          ...cleanedFields,
          lastUpdateTime: Date.now(),
          title: cleanedFields.blogTitle,
        },
      },
      { new: true }, // 返回更新后的文档
    )

    if (!blog) {
      throw new GeneralException('blog.blogNotFound')
    }

    return blog
  }

  async getContent(contentDto: GetContentDto) {
    const { blogId } = contentDto

    const blog = await this.blogModel.findOne({ blogId })

    if (!blog) {
      throw new GeneralException('blog.blogNotFound')
    }

    return {
      blogId,
      content: blog.content,
    }
  }

  async postContent(contentDto: PostContentDto) {
    const { blogId, content } = contentDto

    const blog = await this.blogModel.findOne({ blogId })

    if (!blog) {
      throw new GeneralException('blog.blogNotFound')
    }

    blog.content = content

    await blog.save()

    return {
      blogId,
      content,
    }
  }

  async deleteBlog(blogId: string) {
    const blog = await this.blogModel.findOneAndDelete({ blogId })
    if (!blog) {
      throw new GeneralException('blog.blogNotFound')
    }
    return {
      blogId,
    }
  }
}
