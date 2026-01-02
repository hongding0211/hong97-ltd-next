import { registerAs } from '@nestjs/config'

export default registerAs('bark', () => ({
  url: process.env.BARK_URL || '',
}))
