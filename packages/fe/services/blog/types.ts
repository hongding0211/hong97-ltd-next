import {
  CommentDto,
  CommentResponseDto,
  CommentsDto,
  CommentsResponseDto,
} from '@server/modules/blog/dto/comment.dto'
import { MetaDto } from '@server/modules/blog/dto/meta.dto'
import { MetaResponseDto } from '@server/modules/blog/dto/meta.dto'
import { ViewDto } from '@server/modules/blog/dto/view.dto'
import { API } from '../types'

export type BlogAPIS = {
  PostBlogView: API<undefined, typeof ViewDto, typeof ViewDto>
  GetBlogMeta: API<undefined, typeof MetaDto, typeof MetaResponseDto>
  PostBlogLike: API<undefined, typeof MetaDto, typeof MetaResponseDto>
  PostBlogComment: API<undefined, typeof CommentDto, typeof CommentResponseDto>
  GetBlogComments: API<
    undefined,
    typeof CommentsDto,
    typeof CommentsResponseDto
  >
}
