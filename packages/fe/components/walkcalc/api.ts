import type {
  WalkcalcGroupDto,
  WalkcalcGroupSummaryDto,
  WalkcalcHomeSummaryDto,
  WalkcalcParticipantProjectionDto,
  WalkcalcPublicUserDto,
  WalkcalcRecordDto,
  WalkcalcSettlementSuggestionDto,
  WalkcalcStatisticsDto,
} from '@server/modules/walkcalc/dto/response.dto'

export type {
  WalkcalcGroupDto,
  WalkcalcGroupSummaryDto,
  WalkcalcHomeSummaryDto,
  WalkcalcParticipantProjectionDto,
  WalkcalcPublicUserDto,
  WalkcalcRecordDto,
  WalkcalcSettlementSuggestionDto,
  WalkcalcStatisticsDto,
}

export type Page<T> = {
  data: T[]
  total: number
  page: number
  pageSize: number
}

let refreshInFlight: Promise<boolean> | null = null

async function refreshSession(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = fetch('/api/auth/refreshToken', {
      method: 'POST',
      credentials: 'include',
    })
      .then((response) => response.ok)
      .catch(() => false)
      .finally(() => {
        refreshInFlight = null
      })
  }
  return refreshInFlight
}

export async function walkcalcApi<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const request = () =>
    fetch(`/api/walkcalc${path}`, {
      ...init,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...init.headers },
    })
  let response = await request()
  if (response.status === 401 && (await refreshSession()))
    response = await request()
  const envelope = await response.json().catch(() => null)
  if (!response.ok || !envelope?.isSuccess) {
    throw new Error(
      envelope?.msg ||
        (response.status === 401
          ? '登录已过期，请重新登录。'
          : '请求失败，请稍后重试。'),
    )
  }
  return envelope.data as T
}

export const groupPath = (code: string) => `/groups/${encodeURIComponent(code)}`

export function queryString(
  values: Record<string, string | number | undefined>,
) {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && value !== '') query.set(key, String(value))
  }
  const text = query.toString()
  return text ? `?${text}` : ''
}

export function money(value: string | number | undefined, currency = 'CNY') {
  const amount = Number(value || 0)
  try {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency,
      currencyDisplay: 'narrowSymbol',
    }).format(amount)
  } catch {
    return `${currency} ${amount.toFixed(2)}`
  }
}

export function participantName(person?: {
  tempName?: string
  profile?: { name?: string }
  participantId?: string
}) {
  return (
    person?.profile?.name || person?.tempName || person?.participantId || '成员'
  )
}

export const categories = [
  ['food', '餐饮'],
  ['beverage', '饮品'],
  ['shopping', '购物'],
  ['traffic', '交通'],
  ['accommodation', '住宿'],
  ['vacation', '旅行'],
  ['ticket', '票务'],
  ['game', '娱乐'],
  ['transfer', '其他'],
] as const

export function categoryName(id?: string) {
  return categories.find(([key]) => key === id)?.[1] || id || '其他'
}

const commonCurrencies = [
  'CNY',
  'USD',
  'EUR',
  'JPY',
  'HKD',
  'GBP',
  'TWD',
  'KRW',
  'SGD',
  'AUD',
]
export const currencies = [
  ...commonCurrencies,
  ...Intl.supportedValuesOf('currency').filter(
    (code) => !commonCurrencies.includes(code),
  ),
]
