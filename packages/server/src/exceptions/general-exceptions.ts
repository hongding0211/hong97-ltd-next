import { HttpException, HttpStatus } from '@nestjs/common'
import { I18nPath } from 'src/i18n/types'

export class GeneralException extends HttpException {
  code?: number
  message: string

  constructor(key: I18nPath, code?: number) {
    super(key, HttpStatus.INTERNAL_SERVER_ERROR)
    this.code = code
    this.message = key
  }
}
