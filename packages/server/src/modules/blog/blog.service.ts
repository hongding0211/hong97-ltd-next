import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import pinyin from 'pinyin'
import { MockNames } from 'src/common/assets/mock-names'
import { GeneralException } from 'src/exceptions/general-exceptions'
import { v4 as uuidv4 } from 'uuid'
import { UserService } from '../user/user.service'
import {
  BlogDto,
  BlogResponseDto,
  BlogsDto,
  BlogsResponseDto,
} from './dto/blog.dto'
import { CommentDto, CommentsDto, CommentsResponseDto } from './dto/comment.dto'
import { DeleteCommentDto } from './dto/deleteComment.dto'
import { MetaDto, MetaResponseDto } from './dto/meta.dto'
import { ViewDto } from './dto/view.dto'
import { Blog, BlogDocument } from './schema/blog.schema'

@Injectable()
export class BlogService {
  constructor(
    @InjectModel(Blog.name) private blogModel: Model<BlogDocument>,
    private userService: UserService,
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

    return {
      blogId,
      blogTitle: blog.title,
      viewCount: blog.viewHistory.length,
      likeCount: blog.likeHistory.length,
      isLiked,
      time: blog.time,
      coverImg: blog.coverImg,
      keywords: blog.keywords,
      authRequired: blog.authRequired,
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

  async list(blogsDto: BlogsDto): Promise<BlogsResponseDto> {
    const { page = 1, pageSize = 10 } = blogsDto

    const blogs = await this.blogModel
      .find()
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
      })),
      total: blogs.length,
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
}
