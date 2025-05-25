import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { ErrorResponse } from 'src/common/response/err-response'
import { MetaDto } from './dto/meta'
import { ViewDto } from './dto/view'
import { Blog, BlogDocument } from './schema/blog.schema'

@Injectable()
export class BlogService {
  constructor(@InjectModel(Blog.name) private blogModel: Model<BlogDocument>) {}

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
}
