import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
} from '@nestjs/common'
import { RootOnly } from 'src/decorators/root-only.decorator'
import { UserId } from 'src/decorators/user-id.decorator'
import { BlogService } from './blog.service'
import { BlogDto, BlogsDto } from './dto/blog.dto'
import { CommentDto, CommentsDto } from './dto/comment.dto'
import { MetaDto } from './dto/meta.dto'
import { ViewDto } from './dto/view.dto'

@Controller('blog')
export class BlogController {
  constructor(private readonly blogService: BlogService) {}

  @Post('new')
  @RootOnly()
  @HttpCode(HttpStatus.OK)
  async new(@Body() blogDto: BlogDto) {
    return this.blogService.new(blogDto)
  }

  @Get('list')
  @HttpCode(HttpStatus.OK)
  async blogs(@Query() blogsDto: BlogsDto) {
    return this.blogService.list(blogsDto)
  }

  @Post('view')
  @HttpCode(HttpStatus.OK)
  async view(@Body() viewDto: ViewDto, @UserId() userId?: string) {
    return this.blogService.view(viewDto, userId)
  }

  @Get('meta')
  @HttpCode(HttpStatus.OK)
  async meta(@Query() metaDto: MetaDto, @UserId() userId?: string) {
    return this.blogService.meta(metaDto, userId)
  }

  @Post('like')
  @HttpCode(HttpStatus.OK)
  async like(@Body() likeDto: MetaDto, @UserId() userId?: string) {
    return this.blogService.like(likeDto, userId)
  }

  @Post('comment')
  @HttpCode(HttpStatus.OK)
  async comment(@Body() commentDto: CommentDto, @UserId() userId?: string) {
    return this.blogService.comment(commentDto, userId)
  }

  @Get('comments')
  @HttpCode(HttpStatus.OK)
  async comments(@Query() commentsDto: CommentsDto) {
    return this.blogService.comments(commentsDto)
  }
}
