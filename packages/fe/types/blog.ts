export interface IBlogConfig {
  key: string
  title: string
  time: number
  keywords?: string[]
  authRequired?: boolean
  coverImg?: string
  hasPublished?: boolean
  hidden2Public?: boolean
}
