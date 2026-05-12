import {
  MoneyValue,
  addMoneyValues,
  assertMoneyValue,
  assertPositiveMoneyAmount,
  negateMoneyValue,
  splitMoneyValue,
} from './money'

export interface LedgerDelta {
  participantId: string
  balanceValue: MoneyValue
  expenseShareValue: MoneyValue
  paidTotalValue: MoneyValue
  recordCount: number
  settlementInValue: MoneyValue
  settlementOutValue: MoneyValue
}

export interface ExpenseEffectInput {
  amount: string
  payerId: string
  participantIds: string[]
}

export interface SettlementEffectInput {
  amount: string
  fromId: string
  toId: string
}

export function buildExpenseLedgerDeltas(
  input: ExpenseEffectInput,
): LedgerDelta[] {
  const amountValue = assertPositiveMoneyAmount(input.amount)
  const participantIds = uniqueParticipantIds(input.participantIds)
  if (!participantIds.length) {
    throw new Error('Expense requires participants')
  }
  const payerId = input.payerId?.trim()
  if (!payerId) {
    throw new Error('Expense requires payer')
  }

  const splitValues = splitMoneyValue(amountValue, participantIds.length)
  const accumulator = new Map<string, LedgerDelta>()

  participantIds.forEach((participantId, index) => {
    const splitValue = splitValues[index]
    addDelta(accumulator, participantId, {
      balanceValue: negateMoneyValue(splitValue),
      expenseShareValue: splitValue,
      recordCount: 1,
    })
  })

  addDelta(accumulator, payerId, {
    balanceValue: amountValue,
    paidTotalValue: amountValue,
    recordCount: participantIds.includes(payerId) ? 0 : 1,
  })

  return [...accumulator.values()]
}

export function buildSettlementLedgerDeltas(
  input: SettlementEffectInput,
): LedgerDelta[] {
  const amountValue = assertPositiveMoneyAmount(input.amount)
  const fromId = input.fromId?.trim()
  const toId = input.toId?.trim()
  if (!fromId || !toId) {
    throw new Error('Settlement requires sender and receiver')
  }
  if (fromId === toId) {
    throw new Error('Settlement sender and receiver must differ')
  }

  return [
    createDelta(fromId, {
      balanceValue: amountValue,
      settlementOutValue: amountValue,
      recordCount: 1,
    }),
    createDelta(toId, {
      balanceValue: negateMoneyValue(amountValue),
      settlementInValue: amountValue,
      recordCount: 1,
    }),
  ]
}

export function reverseLedgerDeltas(deltas: LedgerDelta[]): LedgerDelta[] {
  return deltas.map((delta) => ({
    participantId: delta.participantId,
    balanceValue: negateMoneyValue(delta.balanceValue),
    expenseShareValue: negateMoneyValue(delta.expenseShareValue),
    paidTotalValue: negateMoneyValue(delta.paidTotalValue),
    recordCount: -delta.recordCount,
    settlementInValue: negateMoneyValue(delta.settlementInValue),
    settlementOutValue: negateMoneyValue(delta.settlementOutValue),
  }))
}

export function involvedExpenseParticipants(input: {
  payerId: string
  participantIds: string[]
}): string[] {
  const payerId = input.payerId?.trim()
  if (!payerId) {
    throw new Error('Expense requires payer')
  }
  return [...new Set([payerId, ...uniqueParticipantIds(input.participantIds)])]
}

export function involvedSettlementParticipants(input: {
  fromId: string
  toId: string
}): string[] {
  const fromId = input.fromId?.trim()
  const toId = input.toId?.trim()
  if (!fromId || !toId) {
    throw new Error('Settlement requires sender and receiver')
  }
  if (fromId === toId) {
    throw new Error('Settlement sender and receiver must differ')
  }
  return [fromId, toId]
}

function uniqueParticipantIds(participantIds: string[]): string[] {
  const trimmed = participantIds.map((participantId) => participantId.trim())
  if (trimmed.some((participantId) => !participantId)) {
    throw new Error('Participant id cannot be empty')
  }
  const uniqueIds = [...new Set(trimmed)]
  if (uniqueIds.length !== trimmed.length) {
    throw new Error('Duplicate participant id')
  }
  return uniqueIds
}

function addDelta(
  accumulator: Map<string, LedgerDelta>,
  participantId: string,
  patch: Partial<Omit<LedgerDelta, 'participantId'>>,
) {
  const current = accumulator.get(participantId) ?? createDelta(participantId)
  accumulator.set(participantId, {
    participantId,
    balanceValue: addMoneyValues(
      current.balanceValue,
      patch.balanceValue ?? '0',
    ),
    expenseShareValue: addMoneyValues(
      current.expenseShareValue,
      patch.expenseShareValue ?? '0',
    ),
    paidTotalValue: addMoneyValues(
      current.paidTotalValue,
      patch.paidTotalValue ?? '0',
    ),
    recordCount: current.recordCount + (patch.recordCount ?? 0),
    settlementInValue: addMoneyValues(
      current.settlementInValue,
      patch.settlementInValue ?? '0',
    ),
    settlementOutValue: addMoneyValues(
      current.settlementOutValue,
      patch.settlementOutValue ?? '0',
    ),
  })
}

function createDelta(
  participantId: string,
  patch: Partial<Omit<LedgerDelta, 'participantId'>> = {},
): LedgerDelta {
  return {
    participantId,
    balanceValue: assertMoneyValue(patch.balanceValue ?? '0'),
    expenseShareValue: assertMoneyValue(patch.expenseShareValue ?? '0'),
    paidTotalValue: assertMoneyValue(patch.paidTotalValue ?? '0'),
    recordCount: patch.recordCount ?? 0,
    settlementInValue: assertMoneyValue(patch.settlementInValue ?? '0'),
    settlementOutValue: assertMoneyValue(patch.settlementOutValue ?? '0'),
  }
}
