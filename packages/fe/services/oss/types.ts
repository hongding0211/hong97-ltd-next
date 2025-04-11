import {
  RequestUploadDto,
  RequestUploadResponseDto,
} from '@server/modules/oss/dto/request-upload'
import { API } from '../types'

export type OssAPIS = {
  PostRequestUpload: API<
    undefined,
    typeof RequestUploadDto,
    typeof RequestUploadResponseDto
  >
}
