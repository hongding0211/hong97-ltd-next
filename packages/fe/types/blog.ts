export interface IBlogConfig {
  key: string
  title: string
  path: string
  time: number
  keywords?: string[]
  authRequired?: boolean
  coverImg?: string
}
