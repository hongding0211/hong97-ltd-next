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
import { translateWalkcalc } from './i18n'

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
          ? translateWalkcalc('登录已过期，请重新登录。')
          : translateWalkcalc('请求失败，请稍后重试。')),
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

export function money(
  value: string | number | undefined,
  currency = 'CNY',
  spaceCurrency = false,
) {
  const amount = Number(value || 0)
  try {
    const formatter = new Intl.NumberFormat(
      typeof navigator === 'undefined'
        ? 'zh-CN'
        : navigator.languages?.[0] || navigator.language,
      {
        style: 'currency',
        currency,
        currencyDisplay: 'narrowSymbol',
      },
    )
    if (!spaceCurrency) return formatter.format(amount)

    const parts = formatter.formatToParts(amount)
    const currencyIndex = parts.findIndex((part) => part.type === 'currency')
    const numberIndex = parts.findIndex((part) => part.type === 'integer')
    if (currencyIndex < 0 || numberIndex < 0) return formatter.format(amount)
    const between = parts.slice(
      Math.min(currencyIndex, numberIndex) + 1,
      Math.max(currencyIndex, numberIndex),
    )
    if (between.some((part) => /\s/.test(part.value))) {
      return formatter.format(amount)
    }
    parts[currencyIndex].value =
      currencyIndex < numberIndex
        ? `${parts[currencyIndex].value} `
        : ` ${parts[currencyIndex].value}`
    return parts.map((part) => part.value).join('')
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
    person?.profile?.name ||
    person?.tempName ||
    person?.participantId ||
    translateWalkcalc('成员')
  )
}

export const categories = [
  ['food', '餐饮'],
  ['beverage', '饮品'],
  ['accommodation', '酒店'],
  ['shopping', '购物'],
  ['traffic', '交通'],
  ['stay', '住宿'],
  ['vacation', '旅行'],
  ['transfer', '转账'],
  ['ticket', '票务'],
  ['game', '娱乐'],
  ['other', '其他'],
] as const

export function categoryName(id?: string) {
  return translateWalkcalc(
    categories.find(([key]) => key === id)?.[1] || id || '其他',
  )
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
