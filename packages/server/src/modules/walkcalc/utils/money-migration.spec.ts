import { backfillWalkcalcGroupMoney } from './money-migration'

describe('backfillWalkcalcGroupMoney', () => {
  it('copies integer-cent legacy values into exact money fields', () => {
    const group: any = {
      code: '0000',
      members: [{ userId: 'u1', debt: -120, cost: 50 }],
      tempUsers: [{ uuid: 'tmp1', debt: 40, cost: 25 }],
      records: [{ recordId: 'r1', paid: 300 }],
    }

    const result = backfillWalkcalcGroupMoney(group)

    expect(result).toEqual({ changed: true, issues: [] })
    expect(group.members[0]).toMatchObject({
      debtMinor: '-120',
      costMinor: '50',
    })
    expect(group.tempUsers[0]).toMatchObject({
      debtMinor: '40',
      costMinor: '25',
    })
    expect(group.records[0]).toMatchObject({ paidMinor: '300' })
  })

  it('reports fractional minor-unit legacy values without rounding', () => {
    const group: any = {
      code: '0000',
      members: [{ userId: 'u1', debt: 0.0001, cost: 0 }],
      tempUsers: [],
      records: [],
    }

    const result = backfillWalkcalcGroupMoney(group)

    expect(result.changed).toBe(true)
    expect(result.issues).toEqual([
      expect.objectContaining({
        groupCode: '0000',
        path: 'members.0.debt',
      }),
    ])
    expect(group.members[0].debtMinor).toBeUndefined()
    expect(group.members[0].costMinor).toBe('0')
  })

  it('keeps existing exact fields as the source of truth', () => {
    const group: any = {
      code: '0000',
      members: [{ userId: 'u1', debt: 999, debtMinor: '123', cost: 0 }],
      tempUsers: [],
      records: [{ recordId: 'r1', paid: 999, paidMinor: '456' }],
    }

    const result = backfillWalkcalcGroupMoney(group)

    expect(result).toEqual({ changed: true, issues: [] })
    expect(group.members[0].debtMinor).toBe('123')
    expect(group.members[0].costMinor).toBe('0')
    expect(group.records[0].paidMinor).toBe('456')
  })
})
