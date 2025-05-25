import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
} from '@nestjs/common'
import { UserId } from 'src/decorators/user-id.decorator'
import { BlogService } from './blog.service'
import { CommentDto, CommentsDto } from './dto/comment'
import { MetaDto } from './dto/meta'
import { ViewDto } from './dto/view'

@Controller('blog')
export class BlogController {
  constructor(private readonly blogService: BlogService) {}

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
