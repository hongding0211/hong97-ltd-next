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

interface WalkcalcRecordPushContext extends WalkcalcPushContext {
  records: Array<
    Pick<
      WalkcalcRecord,
      | 'recordId'
      | 'payerId'
      | 'participantIds'
      | 'fromId'
      | 'toId'
      | 'involvedParticipantIds'
    >
  >
}

interface WalkcalcRecipientPlan {
  alertType?: string
  alertRecipients: string[]
  silentRecipients: string[]
}

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
    plan: WalkcalcRecipientPlan,
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
        sends.push(this.safeSend(recipientId, plan.alertType, basePayload))
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

  private unique(values: string[]) {
    return [...new Set(values)]
  }
}
