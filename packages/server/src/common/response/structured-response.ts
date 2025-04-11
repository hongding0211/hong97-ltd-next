import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common'
import { I18nService } from 'nestjs-i18n'
import { Observable } from 'rxjs'
import { map } from 'rxjs/operators'
import { ErrorResponse } from 'src/common/response/err-response'
import {
  IStructureErrorResponse,
  IStructureResponse,
  IStructureSuccessResponse,
} from './types'

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

        // 如果是错误响应
        if (data instanceof ErrorResponse) {
          const errorResponse: IStructureErrorResponse = {
            isSuccess: false,
            msg: this.i18n.t(data.message),
            errCode: data.code,
          }
          return errorResponse
        }

        // 成功响应
        const successResponse: IStructureSuccessResponse<typeof data> = {
          isSuccess: true,
          data,
        }
        return successResponse
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
