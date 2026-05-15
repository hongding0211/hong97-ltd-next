import { HttpException, HttpStatus } from '@nestjs/common'
import { I18nPath } from 'src/i18n/types'

export class GeneralException extends HttpException {
  code?: number
  message: string
  data?: unknown

  constructor(key: I18nPath, code?: number, data?: unknown) {
    super(key, HttpStatus.INTERNAL_SERVER_ERROR)
    this.code = code
    this.message = key
    this.data = data
  }
}
