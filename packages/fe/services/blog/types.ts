import { BlogsDto, BlogsResponseDto } from '@server/modules/blog/dto/blog.dto'
import {
  CommentDto,
  CommentResponseDto,
  CommentsDto,
  CommentsResponseDto,
} from '@server/modules/blog/dto/comment.dto'
import {
  GetContentDto,
  GetContentResponseDto,
  PostContentDto,
  PostContentResponseDto,
} from '@server/modules/blog/dto/content.dto'
import { DeleteCommentDto } from '@server/modules/blog/dto/deleteComment.dto'
import { MetaDto, MetaResponseDto } from '@server/modules/blog/dto/meta.dto'
import { ViewDto } from '@server/modules/blog/dto/view.dto'
import { API } from '../types'

export type BlogAPIS = {
  PostBlogView: API<undefined, typeof ViewDto, typeof ViewDto>
  GetBlogMeta: API<typeof MetaDto, undefined, typeof MetaResponseDto>
  PostBlogLike: API<undefined, typeof MetaDto, typeof MetaResponseDto>
  PostBlogComment: API<undefined, typeof CommentDto, typeof CommentResponseDto>
  GetBlogComments: API<
    typeof CommentsDto,
    undefined,
    typeof CommentsResponseDto
  >
  GetBlogList: API<typeof BlogsDto, undefined, typeof BlogsResponseDto>
  DeleteBlogComment: API<
    typeof DeleteCommentDto,
    undefined,
    typeof DeleteCommentDto
  >
  PutBlogMeta: API<typeof MetaResponseDto, undefined, typeof MetaResponseDto>
  GetBlogContent: API<
    typeof GetContentDto,
    undefined,
    typeof GetContentResponseDto
  >
  PostBlogContent: API<
    typeof PostContentDto,
    undefined,
    typeof PostContentResponseDto
  >
}
