import { legacyNumberToMoneyMinor } from './money'

export interface WalkcalcMoneyMigrationIssue {
  groupCode: string
  path: string
  reason: string
}

export interface WalkcalcMoneyMigrationResult {
  changed: boolean
  issues: WalkcalcMoneyMigrationIssue[]
}

export function backfillWalkcalcGroupMoney(
  group: any,
): WalkcalcMoneyMigrationResult {
  const issues: WalkcalcMoneyMigrationIssue[] = []
  const groupCode = group.code || String(group._id || 'unknown')
  let changed = false

  for (const [index, member] of (group.members || []).entries()) {
    changed =
      backfillField(
        groupCode,
        member,
        'debt',
        'debtMinor',
        `members.${index}`,
        issues,
      ) || changed
    changed =
      backfillField(
        groupCode,
        member,
        'cost',
        'costMinor',
        `members.${index}`,
        issues,
      ) || changed
  }

  for (const [index, tempUser] of (group.tempUsers || []).entries()) {
    changed =
      backfillField(
        groupCode,
        tempUser,
        'debt',
        'debtMinor',
        `tempUsers.${index}`,
        issues,
      ) || changed
    changed =
      backfillField(
        groupCode,
        tempUser,
        'cost',
        'costMinor',
        `tempUsers.${index}`,
        issues,
      ) || changed
  }

  for (const [index, record] of (group.records || []).entries()) {
    changed =
      backfillField(
        groupCode,
        record,
        'paid',
        'paidMinor',
        `records.${index}`,
        issues,
      ) || changed
  }

  return { changed, issues }
}

function backfillField(
  groupCode: string,
  container: any,
  legacyField: string,
  exactField: string,
  pathPrefix: string,
  issues: WalkcalcMoneyMigrationIssue[],
): boolean {
  if (container?.[exactField] !== undefined) {
    return false
  }

  try {
    container[exactField] = legacyNumberToMoneyMinor(
      container?.[legacyField] ?? 0,
    )
    return true
  } catch (err) {
    issues.push({
      groupCode,
      path: `${pathPrefix}.${legacyField}`,
      reason:
        err instanceof Error ? err.message : 'Invalid legacy money amount',
    })
    return false
  }
}
