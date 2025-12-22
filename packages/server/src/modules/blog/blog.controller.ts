import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Put,
  Query,
} from '@nestjs/common'
import { RootOnly } from 'src/decorators/root-only.decorator'
import { UserId } from 'src/decorators/user-id.decorator'
import { BlogService } from './blog.service'
import { BlogDto, BlogNew2Dto, BlogsDto } from './dto/blog.dto'
import { CommentDto, CommentsDto } from './dto/comment.dto'
import { GetContentDto, PostContentDto } from './dto/content.dto'
import { DeleteCommentDto } from './dto/deleteComment.dto'
import { MetaDto, UpdateMetaDto } from './dto/meta.dto'
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

  @Post('new2')
  @RootOnly()
  @HttpCode(HttpStatus.OK)
  async new2(@Body() blogNew2NewDto?: BlogNew2Dto) {
    return this.blogService.new2(blogNew2NewDto)
  }

  @Get('list')
  @HttpCode(HttpStatus.OK)
  async blogs(@Query() blogsDto: BlogsDto, @UserId() userId?: string) {
    return this.blogService.list(blogsDto, userId)
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

  @Put('meta')
  @RootOnly()
  @HttpCode(HttpStatus.OK)
  async updateMeta(@Body() metaDto: UpdateMetaDto) {
    return this.blogService.updateMeta(metaDto)
  }

  @Get('content')
  @HttpCode(HttpStatus.OK)
  async getContent(@Query() contentDto: GetContentDto) {
    return this.blogService.getContent(contentDto)
  }

  @Post('content')
  @RootOnly()
  @HttpCode(HttpStatus.OK)
  async postContent(@Body() contentDto: PostContentDto) {
    return this.blogService.postContent(contentDto)
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

  @Delete('comment')
  @HttpCode(HttpStatus.OK)
  async deleteComment(
    @Query() deleteCommentDto: DeleteCommentDto,
    @UserId() userId?: string,
  ) {
    return this.blogService.deleteComment(deleteCommentDto, userId)
  }

  @Delete()
  @RootOnly()
  @HttpCode(HttpStatus.OK)
  async deleteBlog(@Query() query: MetaDto) {
    const { blogId } = query
    return this.blogService.deleteBlog(blogId)
  }
}
