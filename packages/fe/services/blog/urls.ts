import { BlogAPIS } from './types'

export const BLOG_PATHS: Record<keyof BlogAPIS, string> = {
  GetBlogDraft: 'blog/draft',
  PutBlogDraft: 'blog/draft',
  PutBlogSave: 'blog/save',
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
  PostBlogNew: 'blog/new2',
  DeleteBlog: 'blog',
}
