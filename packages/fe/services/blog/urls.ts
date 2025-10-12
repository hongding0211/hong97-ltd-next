import { BlogAPIS } from './types'

export const BLOG_PATHS: Record<keyof BlogAPIS, string> = {
  PostBlogView: 'blog/view',
  GetBlogMeta: 'blog/meta',
  PostBlogLike: 'blog/like',
  PostBlogComment: 'blog/comment',
  GetBlogComments: 'blog/comments',
  GetBlogList: 'blog/list',
  DeleteBlogComment: 'blog/comment',
  PutBlogMeta: 'blog/meta',
  GetBlogContent: 'blog/content',
  PostBlogContent: 'blog/content',
}
