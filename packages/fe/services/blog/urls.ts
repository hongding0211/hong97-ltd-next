import { BlogAPIS } from './types'

export const BLOG_PATHS: Record<keyof BlogAPIS, string> = {
  PostBlogView: 'blog/view',
  GetBlogMeta: 'blog/meta',
  PostBlogLike: 'blog/like',
}
