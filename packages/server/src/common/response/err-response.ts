import { I18nPath } from '../../i18n/types'

export class ErrorResponse {
  code?: number
  message: string

  constructor(key: I18nPath, code?: number) {
    this.code = code
    this.message = key
  }
}
