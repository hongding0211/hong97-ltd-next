import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import axios from 'axios'

@Injectable()
export class BarkService {
  constructor(private configService: ConfigService) {}

  async push(title: string, content: string) {
    const url = this.configService.get<string>('bark.url')
    if (!url) {
      return
    }
    try {
      await axios.get(
        `${url}/${encodeURIComponent(title)}/${encodeURIComponent(content)}`,
      )
    } catch {
      // noop
    }
  }
}
