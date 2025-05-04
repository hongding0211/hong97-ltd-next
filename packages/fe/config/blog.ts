export interface IBlogConfig {
  key: string
  title: string
  path: string
  time: number
  keywords?: string[]
  authRequired?: boolean
}

export const BlogConfig: IBlogConfig[] = [
  {
    key: '2025-mood-closet',
    title: 'Mood Closet',
    path: '2025-mood-closet',
    time: 1746387234000,
    keywords: ['nsfw'],
    authRequired: true,
  },
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
