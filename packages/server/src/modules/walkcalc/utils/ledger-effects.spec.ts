import {
  buildExpenseLedgerDeltas,
  buildSettlementLedgerDeltas,
  involvedExpenseParticipants,
  involvedSettlementParticipants,
  reverseLedgerDeltas,
} from './ledger-effects'
import { formatMoneyAmount } from './money'

function byParticipant(deltas: ReturnType<typeof buildExpenseLedgerDeltas>) {
  return new Map(deltas.map((delta) => [delta.participantId, delta]))
}

function sumBalance(deltas: ReturnType<typeof buildExpenseLedgerDeltas>) {
  return deltas.reduce((sum, delta) => sum + BigInt(delta.balanceValue), 0n)
}

describe('walkcalc ledger effect builders', () => {
  it('builds exact expense deltas when payer is included in participants', () => {
    const deltas = buildExpenseLedgerDeltas({
      amount: '100.00',
      payerId: 'u1',
      participantIds: ['u1', 'u2', 'tmp1'],
    })
    const map = byParticipant(deltas)

    expect(sumBalance(deltas)).toBe(0n)
    expect(map.get('u1')).toMatchObject({
      balanceValue: '6666',
      expenseShareValue: '3334',
      paidTotalValue: '10000',
      recordCount: 1,
    })
    expect(map.get('u2')).toMatchObject({
      balanceValue: '-3333',
      expenseShareValue: '3333',
      paidTotalValue: '0',
      recordCount: 1,
    })
    expect(map.get('tmp1')).toMatchObject({
      balanceValue: '-3333',
      expenseShareValue: '3333',
      recordCount: 1,
    })
    expect(
      involvedExpenseParticipants({
        payerId: 'u1',
        participantIds: ['u1', 'u2', 'tmp1'],
      }),
    ).toEqual(['u1', 'u2', 'tmp1'])
  })

  it('counts payer once when payer is not a split participant', () => {
    const deltas = buildExpenseLedgerDeltas({
      amount: '45.00',
      payerId: 'u1',
      participantIds: ['u2', 'tmp1'],
    })
    const map = byParticipant(deltas)

    expect(sumBalance(deltas)).toBe(0n)
    expect(map.get('u1')).toMatchObject({
      balanceValue: '4500',
      expenseShareValue: '0',
      paidTotalValue: '4500',
      recordCount: 1,
    })
    expect(map.get('u2')).toMatchObject({
      balanceValue: '-2250',
      expenseShareValue: '2250',
      recordCount: 1,
    })
    expect(map.get('tmp1')).toMatchObject({
      balanceValue: '-2250',
      expenseShareValue: '2250',
      recordCount: 1,
    })
    expect(
      involvedExpenseParticipants({
        payerId: 'u1',
        participantIds: ['u2', 'tmp1'],
      }),
    ).toEqual(['u1', 'u2', 'tmp1'])
  })

  it('rejects invalid expense participants and non-positive amounts', () => {
    expect(() =>
      buildExpenseLedgerDeltas({
        amount: '10.00',
        payerId: 'u1',
        participantIds: ['u2', 'u2'],
      }),
    ).toThrow('Duplicate participant id')
    expect(() =>
      buildExpenseLedgerDeltas({
        amount: '0.00',
        payerId: 'u1',
        participantIds: ['u2'],
      }),
    ).toThrow('positive')
    expect(() =>
      buildExpenseLedgerDeltas({
        amount: '10.00',
        payerId: ' ',
        participantIds: ['u2'],
      }),
    ).toThrow('payer')
  })

  it('handles large valid expense amounts without floating-point conversion', () => {
    const deltas = buildExpenseLedgerDeltas({
      amount: '900719925474099.93',
      payerId: 'u1',
      participantIds: ['u2'],
    })

    expect(sumBalance(deltas)).toBe(0n)
    expect(
      formatMoneyAmount(byParticipant(deltas).get('u1')!.balanceValue),
    ).toBe('900719925474099.93')
  })

  it('builds settlement deltas without changing expense share', () => {
    const deltas = buildSettlementLedgerDeltas({
      amount: '12.50',
      fromId: 'u2',
      toId: 'u1',
    })
    const map = byParticipant(deltas)

    expect(sumBalance(deltas)).toBe(0n)
    expect(map.get('u2')).toMatchObject({
      balanceValue: '1250',
      expenseShareValue: '0',
      settlementOutValue: '1250',
      recordCount: 1,
    })
    expect(map.get('u1')).toMatchObject({
      balanceValue: '-1250',
      expenseShareValue: '0',
      settlementInValue: '1250',
      recordCount: 1,
    })
    expect(
      involvedSettlementParticipants({ fromId: 'u2', toId: 'u1' }),
    ).toEqual(['u2', 'u1'])
  })

  it('rejects invalid settlement participants and non-positive amounts', () => {
    expect(() =>
      buildSettlementLedgerDeltas({
        amount: '1.00',
        fromId: 'u1',
        toId: 'u1',
      }),
    ).toThrow('differ')
    expect(() =>
      buildSettlementLedgerDeltas({
        amount: '0.00',
        fromId: 'u1',
        toId: 'u2',
      }),
    ).toThrow('positive')
    expect(() =>
      involvedSettlementParticipants({ fromId: ' ', toId: 'u2' }),
    ).toThrow('sender and receiver')
  })

  it('reverses deltas exactly', () => {
    const deltas = buildSettlementLedgerDeltas({
      amount: '12.50',
      fromId: 'u2',
      toId: 'u1',
    })

    expect(reverseLedgerDeltas(deltas)).toEqual([
      expect.objectContaining({
        participantId: 'u2',
        balanceValue: '-1250',
        settlementOutValue: '-1250',
        recordCount: -1,
      }),
      expect.objectContaining({
        participantId: 'u1',
        balanceValue: '1250',
        settlementInValue: '-1250',
        recordCount: -1,
      }),
    ])
  })
})
