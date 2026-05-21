import { randomUUID } from 'crypto'
import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PushNotificationCatalog } from '../push/catalog'
import { PushService } from '../push/push.service'
import type { SendNotificationResult } from '../push/types'
import { UserService } from '../user/user.service'
import type {
  WalkcalcGroup,
  WalkcalcRecord,
} from './schema/walkcalc-group.schema'
import {
  addMoneyValues,
  formatMoneyAmount,
  splitMoneyValue,
} from './utils/money'
import { WALKCALC_PUSH_CATALOG_ENTRIES } from './walkcalc-push.catalog'

export const WALKCALC_PUSH_APP_ID = 'walkcalc-ios'

type WalkcalcGroupUpdateKind =
  | 'group-invited'
  | 'member-joined'
  | 'temp-user-created'
  | 'group-renamed'
  | 'group-dismissed'

type WalkcalcRecordUpdateKind =
  | 'record-created'
  | 'record-updated'
  | 'record-deleted'
  | 'debts-resolved'

type WalkcalcUpdateKind = WalkcalcGroupUpdateKind | WalkcalcRecordUpdateKind

interface WalkcalcPushContext {
  actorUserId: string
  group: Pick<WalkcalcGroup, 'code' | 'name'>
  memberUserIds: string[]
}

type WalkcalcPushRecord = Pick<
  WalkcalcRecord,
  'recordId' | 'payerId' | 'participantIds' | 'fromId' | 'toId'
> &
  Partial<
    Pick<
      WalkcalcRecord,
      'type' | 'amountValue' | 'category' | 'note' | 'involvedParticipantIds'
    >
  >

interface WalkcalcRecordPushContext extends WalkcalcPushContext {
  records: WalkcalcPushRecord[]
}

interface WalkcalcRecipientPlan {
  alertType?: string
  alertRecipients: string[]
  silentRecipients: string[]
}

interface WalkcalcAlertMessage {
  titleCn: string
  bodyCn: string
  titleEn: string
  bodyEn: string
  payload?: Record<string, unknown>
}

type WalkcalcAlertMessageBuilder = (
  recipientId: string,
) => Promise<WalkcalcAlertMessage>

@Injectable()
export class WalkcalcPushService implements OnModuleInit {
  private readonly logger = new Logger(WalkcalcPushService.name)

  constructor(
    private readonly pushService: PushService,
    private readonly userService: UserService,
    private readonly configService: ConfigService,
    private readonly catalog: PushNotificationCatalog,
  ) {}

  onModuleInit() {
    this.catalog.registerEntries(WALKCALC_PUSH_CATALOG_ENTRIES)
  }

  async notifyGroupInvited(
    context: WalkcalcPushContext & { invitedUserIds: string[] },
  ) {
    const alertRecipients = this.visibleRecipients(
      context.invitedUserIds,
      context,
    )
    await this.dispatch(context, 'group-invited', {
      alertType: 'walkcalc.group.invited',
      alertRecipients,
      silentRecipients: this.silentRecipients(
        context.memberUserIds,
        alertRecipients,
      ),
      buildAlertMessage: async () => ({
        ...this.localizedTitle(context.group.name),
        bodyCn: `${await this.actorName(context.actorUserId)} 邀请你加入群组`,
        bodyEn: `${await this.actorName(
          context.actorUserId,
        )} invited you to join the group`,
      }),
    })
  }

  async notifyMemberJoined(context: WalkcalcPushContext) {
    const alertRecipients = this.visibleRecipients(
      context.memberUserIds,
      context,
    )
    await this.dispatch(context, 'member-joined', {
      alertType: 'walkcalc.group.member-joined',
      alertRecipients,
      silentRecipients: this.silentRecipients(
        context.memberUserIds,
        alertRecipients,
      ),
      buildAlertMessage: async () => ({
        ...this.localizedTitle(context.group.name),
        bodyCn: `${await this.actorName(context.actorUserId)} 加入了群组`,
        bodyEn: `${await this.actorName(context.actorUserId)} joined the group`,
      }),
    })
  }

  async notifyTempUserCreated(context: WalkcalcPushContext) {
    await this.dispatch(context, 'temp-user-created', {
      silentRecipients: this.silentRecipients(context.memberUserIds),
      alertRecipients: [],
    })
  }

  async notifyGroupRenamed(context: WalkcalcPushContext) {
    await this.dispatch(context, 'group-renamed', {
      silentRecipients: this.silentRecipients(context.memberUserIds),
      alertRecipients: [],
    })
  }

  async notifyGroupDismissed(context: WalkcalcPushContext) {
    await this.dispatch(context, 'group-dismissed', {
      alertType: 'walkcalc.group.dismissed',
      alertRecipients: this.visibleRecipients(context.memberUserIds, context),
      silentRecipients: [],
      buildAlertMessage: async () => ({
        ...this.localizedTitle(context.group.name),
        bodyCn: '群组已被解散',
        bodyEn: 'The group was dismissed',
      }),
    })
  }

  async notifyRecordCreated(context: WalkcalcRecordPushContext) {
    await this.dispatchRecord(
      context,
      'record-created',
      'walkcalc.record.created',
    )
  }

  async notifyRecordUpdated(context: WalkcalcRecordPushContext) {
    await this.dispatchRecord(
      context,
      'record-updated',
      'walkcalc.record.updated',
    )
  }

  async notifyRecordDeleted(context: WalkcalcRecordPushContext) {
    await this.dispatchRecord(
      context,
      'record-deleted',
      'walkcalc.record.deleted',
    )
  }

  async notifyDebtsResolved(context: WalkcalcRecordPushContext) {
    await this.dispatchRecord(
      context,
      'debts-resolved',
      'walkcalc.debts.resolved',
    )
  }

  formalMemberIds(memberUserIds: string[]) {
    return this.unique(memberUserIds.filter(Boolean))
  }

  visibleRecipients(candidateIds: string[], context: WalkcalcPushContext) {
    const formalMemberIds = new Set(this.formalMemberIds(context.memberUserIds))
    return this.unique(
      candidateIds.filter(
        (userId) =>
          userId !== context.actorUserId && formalMemberIds.has(userId),
      ),
    )
  }

  silentRecipients(
    memberUserIds: string[],
    alertRecipients: string[] = [],
    excludedRecipients: string[] = [],
  ) {
    const excluded = new Set([...alertRecipients, ...excludedRecipients])
    return this.formalMemberIds(memberUserIds).filter(
      (userId) => !excluded.has(userId),
    )
  }

  affectedFormalUserIds(context: WalkcalcRecordPushContext) {
    const formalMemberIds = new Set(this.formalMemberIds(context.memberUserIds))
    return this.unique(
      context.records
        .flatMap((record) => [
          record.payerId,
          ...(record.participantIds || []),
          record.fromId,
          record.toId,
          ...(record.involvedParticipantIds || []),
        ])
        .filter((participantId): participantId is string => !!participantId)
        .filter((participantId) => formalMemberIds.has(participantId)),
    )
  }

  private async dispatchRecord(
    context: WalkcalcRecordPushContext,
    updateKind: WalkcalcRecordUpdateKind,
    alertType: string,
  ) {
    const alertRecipients = this.visibleRecipients(
      this.affectedFormalUserIds(context),
      context,
    )
    await this.dispatch(
      context,
      updateKind,
      {
        alertType,
        alertRecipients,
        silentRecipients: this.silentRecipients(
          context.memberUserIds,
          alertRecipients,
        ),
        buildAlertMessage: (recipientId) =>
          this.buildRecordAlertMessage(context, updateKind, recipientId),
      },
      {
        recordId: context.records[0]?.recordId,
        affectedUserIds: this.affectedFormalUserIds(context),
      },
    )
  }

  private async dispatch(
    context: WalkcalcPushContext,
    updateKind: WalkcalcUpdateKind,
    plan: WalkcalcRecipientPlan & {
      buildAlertMessage?: WalkcalcAlertMessageBuilder
    },
    extraPayload: Record<string, unknown> = {},
  ) {
    const actorName = await this.actorName(context.actorUserId)
    const basePayload = {
      groupCode: context.group.code,
      groupName: context.group.name,
      actorUserId: context.actorUserId,
      actorName,
      updateKind,
      ...extraPayload,
    }
    const sends: Array<Promise<SendNotificationResult | undefined>> = []

    if (plan.alertType) {
      for (const recipientId of plan.alertRecipients) {
        const alertMessage = await plan.buildAlertMessage?.(recipientId)
        sends.push(
          this.safeSend(recipientId, plan.alertType, {
            ...basePayload,
            titleCn: alertMessage?.titleCn ?? context.group.name,
            bodyCn: alertMessage?.bodyCn ?? '',
            titleEn: alertMessage?.titleEn ?? context.group.name,
            bodyEn: alertMessage?.bodyEn ?? '',
            ...alertMessage?.payload,
          }),
        )
      }
    }

    for (const recipientId of plan.silentRecipients) {
      sends.push(
        this.safeSend(recipientId, 'walkcalc.sync.requested', {
          syncId: randomUUID(),
          groupCode: context.group.code,
          updateKind,
        }),
      )
    }

    await Promise.all(sends)
  }

  private async safeSend(
    recipientId: string,
    type: string,
    payload: Record<string, unknown>,
  ) {
    try {
      const result = await this.pushService.sendNotification({
        appId: this.appId(),
        recipientId,
        type,
        payload,
      })
      const failed = result.results.filter(
        (item) => item.code !== 'accepted' && item.code !== 'no-destination',
      )
      if (failed.length) {
        this.logger.warn(
          `Walkcalc push ${type} had ${failed.length} failed destination(s) for ${recipientId}`,
        )
      }
      return result
    } catch (error) {
      this.logger.warn(
        `Walkcalc push ${type} failed for ${recipientId}: ${
          (error as Error).message
        }`,
      )
      return undefined
    }
  }

  private appId() {
    return (
      this.configService.get<string>('walkcalc.pushAppId') ||
      process.env.WALKCALC_PUSH_APP_ID ||
      WALKCALC_PUSH_APP_ID
    )
  }

  private async actorName(actorUserId: string) {
    try {
      const actor = await this.userService.findUserById(actorUserId)
      return actor.profile?.name || actorUserId
    } catch {
      return actorUserId
    }
  }

  private async buildRecordAlertMessage(
    context: WalkcalcRecordPushContext,
    updateKind: WalkcalcRecordUpdateKind,
    recipientId: string,
  ): Promise<WalkcalcAlertMessage> {
    if (updateKind === 'debts-resolved') {
      return this.buildBulkSettlementAlertMessage(context, recipientId)
    }

    const record = this.selectRecordForRecipient(context.records, recipientId)
    const bodyCn =
      record?.type === 'settlement'
        ? await this.settlementBody(record, recipientId, updateKind, 'cn')
        : await this.expenseBody(record, recipientId, updateKind, 'cn')
    const bodyEn =
      record?.type === 'settlement'
        ? await this.settlementBody(record, recipientId, updateKind, 'en')
        : await this.expenseBody(record, recipientId, updateKind, 'en')

    return {
      ...this.localizedTitle(context.group.name),
      bodyCn,
      bodyEn,
      payload: this.recordDisplayPayload(record),
    }
  }

  private selectRecordForRecipient(
    records: WalkcalcPushRecord[],
    recipientId: string,
  ) {
    return (
      [...records]
        .reverse()
        .find((record) => this.recordIncludesRecipient(record, recipientId)) ||
      records[records.length - 1] ||
      records[0]
    )
  }

  private recordIncludesRecipient(
    record: WalkcalcPushRecord | undefined,
    recipientId: string,
  ) {
    if (!record) {
      return false
    }
    return [
      record.payerId,
      ...(record.participantIds || []),
      record.fromId,
      record.toId,
      ...(record.involvedParticipantIds || []),
    ].includes(recipientId)
  }

  private async expenseBody(
    record: WalkcalcPushRecord | undefined,
    recipientId: string,
    updateKind: WalkcalcRecordUpdateKind,
    locale: 'cn' | 'en',
  ) {
    if (!record?.amountValue) {
      return this.fallbackRecordBody(updateKind, locale)
    }

    const note = this.displayNote(record, locale)
    if (record.payerId === recipientId) {
      const participantList = await this.participantList(
        (record.participantIds || []).filter((id) => id !== recipientId),
        locale,
      )
      const paidText =
        locale === 'cn'
          ? participantList
            ? `你支付了 ${this.currency(
                record.amountValue,
              )} 给 ${participantList}`
            : `你支付了 ${this.currency(record.amountValue)}`
          : participantList
            ? `You paid ${this.currency(
                record.amountValue,
              )} for ${participantList}`
            : `You paid ${this.currency(record.amountValue)}`
      return this.recordBody(paidText, updateKind, locale, note)
    }

    const payerName = await this.participantName(record.payerId)
    const share = this.expenseShare(record, recipientId)
    if (!share) {
      return this.fallbackRecordBody(updateKind, locale, note)
    }

    const paidText =
      locale === 'cn'
        ? `${payerName} 替你支付了 ${this.currency(share)}`
        : `${payerName} paid ${this.currency(share)} for you`
    return this.recordBody(paidText, updateKind, locale, note)
  }

  private async settlementBody(
    record: WalkcalcPushRecord | undefined,
    recipientId: string,
    updateKind: WalkcalcRecordUpdateKind,
    locale: 'cn' | 'en',
  ) {
    if (!record?.amountValue) {
      return this.fallbackSettlementBody(updateKind, locale)
    }

    if (record.fromId === recipientId) {
      const targetName = await this.participantName(record.toId)
      const paidText =
        locale === 'cn'
          ? `你转给 ${targetName} ${this.currency(record.amountValue)}`
          : `You transferred ${this.currency(
              record.amountValue,
            )} to ${targetName}`
      return this.recordBody(paidText, updateKind, locale)
    }
    if (record.toId === recipientId) {
      const sourceName = await this.participantName(record.fromId)
      const paidText =
        locale === 'cn'
          ? `${sourceName} 转给你 ${this.currency(record.amountValue)}`
          : `${sourceName} transferred ${this.currency(
              record.amountValue,
            )} to you`
      return this.recordBody(paidText, updateKind, locale)
    }

    return this.fallbackSettlementBody(updateKind, locale)
  }

  private async buildBulkSettlementAlertMessage(
    context: WalkcalcRecordPushContext,
    recipientId: string,
  ): Promise<WalkcalcAlertMessage> {
    const total = context.records
      .filter(
        (record) =>
          record.fromId === recipientId || record.toId === recipientId,
      )
      .reduce(
        (sum, record) =>
          record.amountValue ? addMoneyValues(sum, record.amountValue) : sum,
        '0',
      )

    return {
      ...this.localizedTitle(context.group.name),
      bodyCn: `与你有关的结算已完成：${this.currency(total)}`,
      bodyEn: `A settlement involving you was completed: ${this.currency(
        total,
      )}`,
      payload: {
        amount: formatMoneyAmount(total),
      },
    }
  }

  private expenseShare(record: WalkcalcPushRecord, recipientId: string) {
    const participantIds = record.participantIds || []
    const index = participantIds.indexOf(recipientId)
    if (index < 0 || !record.amountValue || !participantIds.length) {
      return undefined
    }
    return splitMoneyValue(record.amountValue, participantIds.length)[index]
  }

  private recordBody(
    base: string,
    updateKind: WalkcalcRecordUpdateKind,
    locale: 'cn' | 'en',
    note = '',
  ) {
    if (locale === 'en') {
      switch (updateKind) {
        case 'record-updated':
          return `Updated: ${base}${note}`
        case 'record-deleted':
          return `Deleted: ${base}${note}`
        default:
          return `${base}${note}`
      }
    }

    switch (updateKind) {
      case 'record-updated':
        return `${base} 已更新${note}`
      case 'record-deleted':
        return `${base} 已删除${note}`
      default:
        return `${base}${note}`
    }
  }

  private fallbackRecordBody(
    updateKind: WalkcalcRecordUpdateKind,
    locale: 'cn' | 'en',
    note = '',
  ) {
    if (locale === 'en') {
      switch (updateKind) {
        case 'record-updated':
          return `A record involving you was updated${note}`
        case 'record-deleted':
          return `A record involving you was deleted${note}`
        default:
          return `A record involving you was added${note}`
      }
    }

    switch (updateKind) {
      case 'record-updated':
        return `与你有关的账单已更新${note}`
      case 'record-deleted':
        return `与你有关的账单已删除${note}`
      default:
        return `新增了一笔与你有关的账单${note}`
    }
  }

  private fallbackSettlementBody(
    updateKind: WalkcalcRecordUpdateKind,
    locale: 'cn' | 'en',
  ) {
    if (locale === 'en') {
      switch (updateKind) {
        case 'record-updated':
          return 'A settlement involving you was updated'
        case 'record-deleted':
          return 'A settlement involving you was deleted'
        default:
          return 'A settlement involving you was added'
      }
    }

    switch (updateKind) {
      case 'record-updated':
        return '与你有关的结算已更新'
      case 'record-deleted':
        return '与你有关的结算已删除'
      default:
        return '新增了一笔与你有关的结算'
    }
  }

  private async participantList(participantIds: string[], locale: 'cn' | 'en') {
    const names = await Promise.all(
      this.unique(participantIds).map((id) => this.participantName(id)),
    )
    if (!names.length) {
      return ''
    }
    if (names.length > 3) {
      return locale === 'cn'
        ? `${names.slice(0, 3).join('、')} 等 ${names.length} 人`
        : `${names.slice(0, 3).join(', ')}, and ${names.length - 3} more`
    }
    return names.join(locale === 'cn' ? '、' : ', ')
  }

  private async participantName(participantId?: string) {
    if (!participantId) {
      return ''
    }
    return this.actorName(participantId)
  }

  private displayNote(record?: WalkcalcPushRecord, locale: 'cn' | 'en' = 'cn') {
    const note = record?.note?.trim() || record?.category?.trim()
    if (!note) {
      return ''
    }
    return locale === 'cn' ? `（${note}）` : ` (${note})`
  }

  private recordDisplayPayload(record?: WalkcalcPushRecord) {
    return {
      amount: record?.amountValue
        ? formatMoneyAmount(record.amountValue)
        : undefined,
      displayNote: this.displayNote(record),
      payerId: record?.payerId,
      fromId: record?.fromId,
      toId: record?.toId,
    }
  }

  private currency(value: string) {
    return `¥${formatMoneyAmount(value)}`
  }

  private localizedTitle(groupName: string) {
    return {
      titleCn: groupName,
      titleEn: groupName,
    }
  }

  private unique(values: string[]) {
    return [...new Set(values)]
  }
}
