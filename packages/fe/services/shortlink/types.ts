import { CreateShortLinkDto } from '@server/modules/shortlink/dto/create-shortlink.dto'
import { QueryShortLinkDto } from '@server/modules/shortlink/dto/query-shortlink.dto'
import {
  ShortLinkListResponseDto,
  ShortLinkResponseDto,
} from '@server/modules/shortlink/dto/shortlink-response.dto'
import { UpdateShortLinkDto } from '@server/modules/shortlink/dto/update-shortlink.dto'
import { API } from '../types'

export type ShortLinkAPIS = {
  PostShortLinkCreate: API<
    undefined,
    typeof CreateShortLinkDto,
    typeof ShortLinkResponseDto
  >
  GetShortLinkList: API<
    typeof QueryShortLinkDto,
    undefined,
    typeof ShortLinkListResponseDto
  >
  GetShortLinkDetail: API<
    { id: string },
    undefined,
    typeof ShortLinkResponseDto
  >
  PutShortLinkUpdate: API<
    { id: string },
    typeof UpdateShortLinkDto,
    typeof ShortLinkResponseDto
  >
  DeleteShortLink: API<{ id: string }, undefined, undefined>
  GetShortLinkRedirect: API<{ shortCode: string }, undefined, { url: string }>
}
