import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common'
import { I18nService } from 'nestjs-i18n'
import { Observable, of, throwError } from 'rxjs'
import { catchError, map } from 'rxjs/operators'
import { GeneralException } from '../../exceptions/general-exceptions'
import {
  IStructureErrorResponse,
  IStructureResponse,
  IStructureSuccessResponse,
} from './types'

@Injectable()
export class StructuredResponseInterceptor implements NestInterceptor {
  constructor(private readonly i18n: I18nService) {}

  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<IStructureResponse> {
    return next.handle().pipe(
      map((data) => {
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
      catchError((err) => {
        if (err instanceof GeneralException) {
          const errorResponse: IStructureErrorResponse = {
            isSuccess: false,
            msg: this.i18n.t(err.message),
            errCode: err.code,
            data: err.data ?? null,
          }
          return of(errorResponse)
        }

        return throwError(() => err)
      }),
    )
  }

  private isApiResponse(data: any): data is IStructureResponse {
    return (
      data && typeof data === 'object' && typeof data.isSuccess === 'boolean'
    )
  }
}
