import type { NotificationCatalogEntry } from '../push/catalog'

const WALKCALC_GROUP_DATA_KEYS = [
  'groupCode',
  'groupName',
  'actorUserId',
  'actorName',
  'updateKind',
]

const WALKCALC_RECORD_DATA_KEYS = [
  ...WALKCALC_GROUP_DATA_KEYS,
  'recordId',
  'affectedUserIds',
]

export const WALKCALC_PUSH_CATALOG_ENTRIES: NotificationCatalogEntry[] = [
  {
    type: 'walkcalc.group.invited',
    mode: 'alert',
    requiredPayloadKeys: WALKCALC_GROUP_DATA_KEYS,
    localization: {
      strategy: 'serverResolved',
      templates: {
        en: {
          title: 'Walkcalc invitation',
          body: '{actorName} invited you to {groupName}',
        },
        cn: {
          title: 'Walkcalc 邀请',
          body: '{actorName} 邀请你加入 {groupName}',
        },
      },
    },
    dataKeys: WALKCALC_GROUP_DATA_KEYS,
    sound: 'default',
    apns: {
      pushType: 'alert',
      priority: '10',
      category: 'WALKCALC_GROUP',
      threadIdPayloadKey: 'groupCode',
    },
  },
  {
    type: 'walkcalc.group.member-joined',
    mode: 'alert',
    requiredPayloadKeys: WALKCALC_GROUP_DATA_KEYS,
    localization: {
      strategy: 'serverResolved',
      templates: {
        en: {
          title: 'New group member',
          body: '{actorName} joined {groupName}',
        },
        cn: {
          title: '新成员加入',
          body: '{actorName} 加入了 {groupName}',
        },
      },
    },
    dataKeys: WALKCALC_GROUP_DATA_KEYS,
    sound: 'default',
    apns: {
      pushType: 'alert',
      priority: '10',
      category: 'WALKCALC_GROUP',
      threadIdPayloadKey: 'groupCode',
    },
  },
  {
    type: 'walkcalc.group.dismissed',
    mode: 'alert',
    requiredPayloadKeys: WALKCALC_GROUP_DATA_KEYS,
    localization: {
      strategy: 'serverResolved',
      templates: {
        en: {
          title: 'Group dismissed',
          body: '{actorName} dismissed {groupName}',
        },
        cn: {
          title: '群组已解散',
          body: '{actorName} 解散了 {groupName}',
        },
      },
    },
    dataKeys: WALKCALC_GROUP_DATA_KEYS,
    sound: 'default',
    apns: {
      pushType: 'alert',
      priority: '10',
      category: 'WALKCALC_GROUP',
      threadIdPayloadKey: 'groupCode',
    },
  },
  {
    type: 'walkcalc.record.created',
    mode: 'alert',
    requiredPayloadKeys: WALKCALC_RECORD_DATA_KEYS,
    localization: {
      strategy: 'serverResolved',
      templates: {
        en: {
          title: 'New Walkcalc record',
          body: '{actorName} added a record in {groupName}',
        },
        cn: {
          title: '新账单',
          body: '{actorName} 在 {groupName} 添加了一笔账单',
        },
      },
    },
    dataKeys: WALKCALC_RECORD_DATA_KEYS,
    sound: 'default',
    apns: {
      pushType: 'alert',
      priority: '10',
      category: 'WALKCALC_RECORD',
      threadIdPayloadKey: 'groupCode',
      collapseIdPayloadKey: 'recordId',
    },
  },
  {
    type: 'walkcalc.record.updated',
    mode: 'alert',
    requiredPayloadKeys: WALKCALC_RECORD_DATA_KEYS,
    localization: {
      strategy: 'serverResolved',
      templates: {
        en: {
          title: 'Walkcalc record updated',
          body: '{actorName} updated a record in {groupName}',
        },
        cn: {
          title: '账单已更新',
          body: '{actorName} 更新了 {groupName} 的一笔账单',
        },
      },
    },
    dataKeys: WALKCALC_RECORD_DATA_KEYS,
    sound: 'default',
    apns: {
      pushType: 'alert',
      priority: '10',
      category: 'WALKCALC_RECORD',
      threadIdPayloadKey: 'groupCode',
      collapseIdPayloadKey: 'recordId',
    },
  },
  {
    type: 'walkcalc.record.deleted',
    mode: 'alert',
    requiredPayloadKeys: WALKCALC_RECORD_DATA_KEYS,
    localization: {
      strategy: 'serverResolved',
      templates: {
        en: {
          title: 'Walkcalc record deleted',
          body: '{actorName} deleted a record in {groupName}',
        },
        cn: {
          title: '账单已删除',
          body: '{actorName} 删除了 {groupName} 的一笔账单',
        },
      },
    },
    dataKeys: WALKCALC_RECORD_DATA_KEYS,
    sound: 'default',
    apns: {
      pushType: 'alert',
      priority: '10',
      category: 'WALKCALC_RECORD',
      threadIdPayloadKey: 'groupCode',
      collapseIdPayloadKey: 'recordId',
    },
  },
  {
    type: 'walkcalc.debts.resolved',
    mode: 'alert',
    requiredPayloadKeys: [
      'groupCode',
      'groupName',
      'actorUserId',
      'actorName',
      'updateKind',
      'affectedUserIds',
    ],
    localization: {
      strategy: 'serverResolved',
      templates: {
        en: {
          title: 'Walkcalc debts resolved',
          body: '{actorName} resolved debts in {groupName}',
        },
        cn: {
          title: '债务已结算',
          body: '{actorName} 结算了 {groupName} 的债务',
        },
      },
    },
    dataKeys: WALKCALC_RECORD_DATA_KEYS,
    sound: 'default',
    apns: {
      pushType: 'alert',
      priority: '10',
      category: 'WALKCALC_RECORD',
      threadIdPayloadKey: 'groupCode',
    },
  },
  {
    type: 'walkcalc.sync.requested',
    mode: 'silent',
    requiredPayloadKeys: ['syncId', 'groupCode', 'updateKind'],
    localization: {
      strategy: 'clientLocalized',
      locKey: 'PUSH_WALKCALC_SYNC_REQUESTED',
      locArgs: ['syncId'],
    },
    dataKeys: ['syncId', 'groupCode', 'updateKind'],
    apns: {
      pushType: 'background',
      priority: '5',
      collapseIdPayloadKey: 'groupCode',
    },
  },
]
