import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common'
import { I18nService } from 'nestjs-i18n'
import { Observable } from 'rxjs'
import { catchError, map } from 'rxjs/operators'
import { GeneralException } from 'src/exceptions/general-exceptions'
import { IStructureResponse, IStructureSuccessResponse } from './types'

@Injectable()
export class StructuredResponseInterceptor implements NestInterceptor {
  constructor(private readonly i18n: I18nService) {}

  async intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    return next.handle().pipe(
      map(async (data) => {
        // 如果已经是 ApiResponse 类型，直接返回
        if (this.isApiResponse(data)) {
          return data
        }

        // 成功响应
        const successResponse: IStructureSuccessResponse<typeof data> = {
          isSuccess: true,
          data,
        }
        return successResponse
      }),
      catchError(async (err) => {
        if (err instanceof GeneralException) {
          return {
            iSuccess: false,
            msg: this.i18n.t(err.message),
            code: err.code,
            data: null,
          }
        }
      }),
    )
  }

  private isApiResponse(data: any): data is IStructureResponse {
    return (
      data &&
      typeof data === 'object' &&
      'isSuccess' in data &&
      'data' in data &&
      'msg' in data &&
      'errCode' in data
    )
  }
}
