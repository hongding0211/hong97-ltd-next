import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { MockNames } from 'src/common/assets/mock-names'
import { ErrorResponse } from 'src/common/response/err-response'
import { v4 as uuidv4 } from 'uuid'
import { UserService } from '../user/user.service'
import { CommentDto, CommentsDto, CommentsResponseDto } from './dto/comment'
import { MetaDto } from './dto/meta'
import { ViewDto } from './dto/view'
import { Blog, BlogDocument } from './schema/blog.schema'

@Injectable()
export class BlogService {
  constructor(
    @InjectModel(Blog.name) private blogModel: Model<BlogDocument>,
    private userService: UserService,
  ) {}

  private async createBlog(blogId: string, blogTitle: string) {
    const blog = new this.blogModel({
      blogId,
      title: blogTitle,
      viewHistory: [],
      likeHistory: [],
    })
    await blog.save()
    return blog
  }

  async view(viewDto: ViewDto, userId?: string) {
    const { blogId, blogTitle } = viewDto

    let blog = await this.blogModel.findOne({ blogId })

    if (!blog) {
      // create new blog record
      blog = await this.createBlog(blogId, blogTitle)
    }

    blog.viewHistory.push({ userId, time: Date.now() })

    await blog.save()

    return blog
  }

  async meta(metaDto: MetaDto, userId?: string) {
    const { blogId } = metaDto

    const blog = await this.blogModel.findOne({ blogId })

    if (!blog) {
      return new ErrorResponse('blog.blogNotFound')
    }

    const isLiked = userId
      ? blog.likeHistory.some((like) => like.userId === userId)
      : false

    return {
      blogId,
      viewCount: blog.viewHistory.length,
      likeCount: blog.likeHistory.length,
      isLiked,
    }
  }

  async like(likeDto: MetaDto, userId?: string) {
    const { blogId } = likeDto

    const blog = await this.blogModel.findOne({ blogId })

    if (!blog) {
      return new ErrorResponse('blog.blogNotFound')
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
      return new ErrorResponse('blog.commentTooLong')
    }

    const blog = await this.blogModel.findOne({ blogId })

    if (!blog) {
      return new ErrorResponse('blog.blogNotFound')
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
      return new ErrorResponse('blog.blogNotFound')
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
}
