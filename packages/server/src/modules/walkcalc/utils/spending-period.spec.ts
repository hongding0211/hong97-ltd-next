import { spendingPeriodLookup } from './spending-period'

describe('spendingPeriodLookup', () => {
  it('uses calendar day boundaries on either side of a DST transition', () => {
    const day = spendingPeriodLookup('day', 'America/New_York', {})
    expect(day(Date.parse('2026-03-08T12:00:00Z'))).toEqual({
      fromOccurredAt: Date.parse('2026-03-08T05:00:00Z'),
      toOccurredAt: Date.parse('2026-03-09T04:00:00Z'),
    })
  })

  it('clips a fixed-offset month to the selected dates', () => {
    const fromOccurredAt = Date.parse('2026-01-15T00:00:00Z')
    const month = spendingPeriodLookup('month', 'GMT+08:00', { fromOccurredAt })
    expect(month(Date.parse('2026-01-21T12:00:00Z'))).toEqual({
      fromOccurredAt,
      toOccurredAt: Date.parse('2026-01-31T16:00:00Z'),
    })
  })

  it('includes both occurrences of a repeated midnight', () => {
    const day = spendingPeriodLookup('day', 'America/Havana', {})
    expect(day(Date.parse('2026-11-01T04:30:00Z'))).toEqual({
      fromOccurredAt: Date.parse('2026-11-01T04:00:00Z'),
      toOccurredAt: Date.parse('2026-11-02T05:00:00Z'),
    })
  })
})
