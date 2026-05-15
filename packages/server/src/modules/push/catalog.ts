import { Injectable } from '@nestjs/common'
import type { PushAppConfig } from '../../config/push/push.config'
import type { PushDeviceDocument } from './schema/push-device.schema'
import type { PushMessage, PushMode } from './types'

interface ServerResolvedLocalization {
  strategy: 'serverResolved'
  templates: Record<string, { title: string; body: string }>
}

interface ClientLocalizedLocalization {
  strategy: 'clientLocalized'
  titleLocKey?: string
  titleLocArgs?: string[]
  locKey: string
  locArgs?: string[]
}

export interface NotificationCatalogEntry {
  type: string
  mode: PushMode
  requiredPayloadKeys: string[]
  localization: ServerResolvedLocalization | ClientLocalizedLocalization
  dataKeys?: string[]
  badgeFromPayloadKey?: string
  sound?: string
  apns?: {
    pushType?: string
    priority?: '5' | '10'
    collapseIdPayloadKey?: string
    category?: string
    threadIdPayloadKey?: string
  }
}

const DEFAULT_ENTRIES: NotificationCatalogEntry[] = [
  {
    type: 'comment.created',
    mode: 'alert',
    requiredPayloadKeys: ['actorName', 'postId', 'commentId'],
    localization: {
      strategy: 'serverResolved',
      templates: {
        en: {
          title: 'New comment',
          body: '{actorName} commented on your post',
        },
        cn: {
          title: '新评论',
          body: '{actorName} 评论了你的文章',
        },
      },
    },
    dataKeys: ['postId', 'commentId'],
    sound: 'default',
    apns: {
      pushType: 'alert',
      priority: '10',
      threadIdPayloadKey: 'postId',
    },
  },
  {
    type: 'system.announcement',
    mode: 'alert',
    requiredPayloadKeys: ['announcementId'],
    localization: {
      strategy: 'clientLocalized',
      titleLocKey: 'PUSH_SYSTEM_ANNOUNCEMENT_TITLE',
      locKey: 'PUSH_SYSTEM_ANNOUNCEMENT_BODY',
      locArgs: ['announcementId'],
    },
    dataKeys: ['announcementId'],
    sound: 'default',
    apns: {
      pushType: 'alert',
      priority: '10',
    },
  },
  {
    type: 'sync.requested',
    mode: 'silent',
    requiredPayloadKeys: ['syncId'],
    localization: {
      strategy: 'clientLocalized',
      locKey: 'PUSH_SYNC_REQUESTED',
      locArgs: ['syncId'],
    },
    dataKeys: ['syncId'],
    apns: {
      pushType: 'background',
      priority: '5',
    },
  },
]

@Injectable()
export class PushNotificationCatalog {
  private readonly entries = new Map(
    DEFAULT_ENTRIES.map((entry) => [entry.type, entry]),
  )

  get(type: string) {
    return this.entries.get(type)
  }

  validatePayload(
    entry: NotificationCatalogEntry,
    payload: Record<string, unknown>,
  ) {
    const missingKeys = entry.requiredPayloadKeys.filter(
      (key) => payload[key] === undefined || payload[key] === null,
    )
    if (missingKeys.length) {
      throw new Error(
        `Missing push payload fields for ${entry.type}: ${missingKeys.join(
          ', ',
        )}`,
      )
    }
  }

  renderMessage(
    app: PushAppConfig,
    device: PushDeviceDocument,
    entry: NotificationCatalogEntry,
    payload: Record<string, unknown>,
  ): PushMessage {
    const locale = this.resolveLocale(app, device.locale)
    const message: PushMessage = {
      app,
      type: entry.type,
      mode: entry.mode,
      data: this.pickData(entry, payload),
      sound: entry.sound,
      apns: {
        pushType: entry.apns?.pushType,
        priority: entry.apns?.priority,
        category: entry.apns?.category,
        collapseId: this.payloadString(
          payload,
          entry.apns?.collapseIdPayloadKey,
        ),
        threadId: this.payloadString(payload, entry.apns?.threadIdPayloadKey),
      },
    }

    if (entry.badgeFromPayloadKey) {
      const badge = Number(payload[entry.badgeFromPayloadKey])
      if (Number.isInteger(badge)) {
        message.badge = badge
      }
    }

    if (entry.localization.strategy === 'serverResolved') {
      const template =
        entry.localization.templates[locale] ||
        entry.localization.templates[app.defaultLocale]
      message.alert = {
        title: this.interpolate(template.title, payload),
        body: this.interpolate(template.body, payload),
      }
    } else if (entry.mode !== 'silent') {
      message.alert = {
        'title-loc-key': entry.localization.titleLocKey,
        'title-loc-args': this.resolveArgs(
          entry.localization.titleLocArgs,
          payload,
        ),
        'loc-key': entry.localization.locKey,
        'loc-args': this.resolveArgs(entry.localization.locArgs, payload),
      }
    }

    return message
  }

  resolveLocale(app: PushAppConfig, locale?: string) {
    const normalizedLocale = locale?.trim().toLowerCase()
    if (normalizedLocale && app.supportedLocales.includes(normalizedLocale)) {
      return normalizedLocale
    }

    return app.defaultLocale
  }

  private pickData(
    entry: NotificationCatalogEntry,
    payload: Record<string, unknown>,
  ) {
    const result: Record<string, unknown> = {}
    for (const key of entry.dataKeys || []) {
      if (payload[key] !== undefined) {
        result[key] = payload[key]
      }
    }

    return result
  }

  private interpolate(template: string, payload: Record<string, unknown>) {
    return template.replace(/\{([^}]+)\}/g, (_, key) =>
      String(payload[key] ?? ''),
    )
  }

  private resolveArgs(
    keys: string[] | undefined,
    payload: Record<string, unknown>,
  ) {
    return keys?.map((key) => String(payload[key] ?? ''))
  }

  private payloadString(payload: Record<string, unknown>, key?: string) {
    if (!key || payload[key] === undefined || payload[key] === null) {
      return undefined
    }

    return String(payload[key])
  }
}
