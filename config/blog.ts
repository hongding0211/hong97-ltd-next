export interface IBlogConfig {
  key: string
  title: string
  path: string
  time: number
  keywords?: string[]
}

export const BlogConfig: IBlogConfig[] = [
  {
    key: 'very-first-blog',
    title: 'First Blog',
    path: 'very-first-blog',
    keywords: ['chore'],
    time: 1727886690000,
  },
]
