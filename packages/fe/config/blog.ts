export interface IBlogConfig {
  key: string
  title: string
  path: string
  time: number
  keywords?: string[]
}

export const BlogConfig: IBlogConfig[] = [
  {
    key: '2024-summary',
    title: '2024 Summary',
    path: '2024-summary',
    keywords: ['nsfw'],
    time: 1735219062000,
  },
  {
    key: 'very-first-blog',
    title: 'First Blog',
    path: 'very-first-blog',
    keywords: ['chore'],
    time: 1727886690000,
  },
]
