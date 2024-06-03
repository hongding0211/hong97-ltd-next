export class ErrorResponse {
  code?: number
  message: string

  constructor(message: string, code?: number) {
    this.code = code
    this.message = message
  }
}
