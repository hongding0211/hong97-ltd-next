export type MoneyValue = string

const MONEY_VALUE_PATTERN = /^-?(0|[1-9]\d*)$/
const DECIMAL_MONEY_PATTERN = /^-?(?:0|[1-9]\d*)(?:\.\d{1,2})?$/
const MAX_ABS_CENTS = BigInt('999999999999999999')

export function parseMoneyAmount(value: unknown): MoneyValue {
  if (typeof value !== 'string') {
    throw new Error('Money amount must be a decimal string')
  }

  const trimmed = value.trim()
  if (!DECIMAL_MONEY_PATTERN.test(trimmed)) {
    throw new Error('Invalid money amount')
  }

  const negative = trimmed.startsWith('-')
  const unsigned = negative ? trimmed.slice(1) : trimmed
  const [integerPart, fractionPart = ''] = unsigned.split('.')
  const cents =
    BigInt(integerPart) * 100n + BigInt(fractionPart.padEnd(2, '0') || '0')
  const signedCents = negative ? -cents : cents

  return fromMoneyValueBigInt(signedCents)
}

export function assertPositiveMoneyAmount(value: unknown): MoneyValue {
  const amount = parseMoneyAmount(value)
  if (toMoneyValueBigInt(amount) <= 0n) {
    throw new Error('Money amount must be positive')
  }
  return amount
}

export function assertMoneyValue(value: unknown): MoneyValue {
  if (typeof value !== 'string' || !MONEY_VALUE_PATTERN.test(value)) {
    throw new Error('Invalid money value')
  }
  const normalized = normalizeMoneyValue(value)
  if (absMoneyValue(toMoneyValueBigInt(normalized)) > MAX_ABS_CENTS) {
    throw new Error('Money amount out of range')
  }
  return normalized
}

export function toMoneyValueBigInt(value: MoneyValue): bigint {
  return BigInt(assertMoneyValueString(value))
}

export function fromMoneyValueBigInt(value: bigint): MoneyValue {
  if (absMoneyValue(value) > MAX_ABS_CENTS) {
    throw new Error('Money amount out of range')
  }
  return normalizeMoneyValue(value.toString())
}

export function formatMoneyAmount(value: unknown): string {
  const cents = toMoneyValueBigInt(assertMoneyValue(value))
  const negative = cents < 0n
  const abs = negative ? -cents : cents
  const integerPart = abs / 100n
  const fractionPart = (abs % 100n).toString().padStart(2, '0')
  return `${negative ? '-' : ''}${integerPart.toString()}.${fractionPart}`
}

export function addMoneyValues(
  left: MoneyValue,
  right: MoneyValue,
): MoneyValue {
  return fromMoneyValueBigInt(
    toMoneyValueBigInt(left) + toMoneyValueBigInt(right),
  )
}

export function negateMoneyValue(value: MoneyValue): MoneyValue {
  return fromMoneyValueBigInt(-toMoneyValueBigInt(value))
}

export function compareMoneyValues(
  left: MoneyValue,
  right: MoneyValue,
): number {
  const leftValue = toMoneyValueBigInt(left)
  const rightValue = toMoneyValueBigInt(right)
  if (leftValue === rightValue) {
    return 0
  }
  return leftValue > rightValue ? 1 : -1
}

export function isZeroMoneyValue(value: MoneyValue): boolean {
  return toMoneyValueBigInt(value) === 0n
}

export function splitMoneyValue(
  amount: MoneyValue,
  participantCount: number,
): MoneyValue[] {
  if (!Number.isInteger(participantCount) || participantCount < 1) {
    throw new Error('Participant count must be positive')
  }

  const total = toMoneyValueBigInt(amount)
  const count = BigInt(participantCount)
  const base = total / count
  const remainder = total % count
  const sign = remainder < 0n ? -1n : 1n
  const extraCount = Number(remainder < 0n ? -remainder : remainder)

  return Array.from({ length: participantCount }, (_, index) =>
    fromMoneyValueBigInt(base + (index < extraCount ? sign : 0n)),
  )
}

function normalizeMoneyValue(value: string): MoneyValue {
  const normalized = BigInt(value).toString()
  return normalized === '-0' ? '0' : normalized
}

function assertMoneyValueString(value: string): string {
  if (!MONEY_VALUE_PATTERN.test(value)) {
    throw new Error('Invalid money value')
  }
  return normalizeMoneyValue(value)
}

function absMoneyValue(value: bigint): bigint {
  return value < 0n ? -value : value
}
