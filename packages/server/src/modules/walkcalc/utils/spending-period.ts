import dayjs from 'dayjs'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'

dayjs.extend(utc)
dayjs.extend(timezone)

export function normalizeFixedTimeZoneOffset(
  value: unknown,
): string | undefined {
  if (typeof value !== 'string') return undefined
  const match = /^(?:GMT)?([+-])([01]\d|2[0-3]):?([0-5]\d)$/.exec(value)
  return match ? `${match[1]}${match[2]}:${match[3]}` : undefined
}

export interface SpendingPeriod {
  fromOccurredAt: number
  toOccurredAt: number
}

function zonedMidnight(date: string, timeZone: string): number {
  const midnight = dayjs.tz(date, timeZone).valueOf()
  // A fall-back transition can repeat midnight. Begin at its first occurrence.
  const previousOffset = dayjs
    .utc(midnight - 86_400_000)
    .tz(timeZone)
    .utcOffset()
  const earlier = dayjs.utc(date).valueOf() - previousOffset * 60_000
  return earlier < midnight &&
    dayjs.utc(earlier).tz(timeZone).format('YYYY-MM-DD HH:mm') ===
      `${date} 00:00`
    ? earlier
    : midnight
}

export function spendingPeriodLookup(
  unit: 'day' | 'month',
  timeZone: string,
  range: Partial<SpendingPeriod>,
): (occurredAt: number) => SpendingPeriod {
  const periods = new Map<string, SpendingPeriod>()
  const fixed = normalizeFixedTimeZoneOffset(timeZone)
  const offset = fixed
    ? (fixed[0] === '-' ? -1 : 1) *
      (Number(fixed.slice(1, 3)) * 60 + Number(fixed.slice(4))) *
      60_000
    : 0
  return (occurredAt) => {
    const local = fixed
      ? dayjs.utc(occurredAt + offset)
      : dayjs.utc(occurredAt).tz(timeZone)
    const key = local.format(unit === 'day' ? 'YYYY-MM-DD' : 'YYYY-MM-01')
    const existing = periods.get(key)
    if (existing) return existing

    const start = dayjs.utc(key)
    const next = start.add(1, unit)
    const startTime = fixed
      ? start.valueOf() - offset
      : zonedMidnight(key, timeZone)
    const endTime = fixed
      ? next.valueOf() - offset
      : zonedMidnight(next.format('YYYY-MM-DD'), timeZone)
    const period = {
      fromOccurredAt: Math.max(startTime, range.fromOccurredAt ?? 0),
      toOccurredAt: Math.min(endTime, range.toOccurredAt ?? endTime),
    }
    periods.set(key, period)
    return period
  }
}
