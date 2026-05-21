import type { NotificationCatalogEntry } from '../push/catalog'

const WALKCALC_GROUP_BASE_KEYS = [
  'groupCode',
  'groupName',
  'actorUserId',
  'actorName',
  'updateKind',
]

const WALKCALC_GROUP_REQUIRED_KEYS = [
  ...WALKCALC_GROUP_BASE_KEYS,
  'titleEn',
  'bodyEn',
  'titleCn',
  'bodyCn',
]

const WALKCALC_RECORD_REQUIRED_KEYS = [
  ...WALKCALC_GROUP_REQUIRED_KEYS,
  'recordId',
  'affectedUserIds',
]

const WALKCALC_RECORD_DATA_KEYS = [
  ...WALKCALC_GROUP_BASE_KEYS,
  'recordId',
  'affectedUserIds',
  'amount',
  'displayNote',
  'payerId',
  'fromId',
  'toId',
]

export const WALKCALC_PUSH_CATALOG_ENTRIES: NotificationCatalogEntry[] = [
  {
    type: 'walkcalc.group.invited',
    mode: 'alert',
    requiredPayloadKeys: WALKCALC_GROUP_REQUIRED_KEYS,
    localization: {
      strategy: 'serverResolved',
      templates: {
        en: {
          title: '{titleEn}',
          body: '{bodyEn}',
        },
        cn: {
          title: '{titleCn}',
          body: '{bodyCn}',
        },
      },
    },
    dataKeys: WALKCALC_GROUP_BASE_KEYS,
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
    requiredPayloadKeys: WALKCALC_GROUP_REQUIRED_KEYS,
    localization: {
      strategy: 'serverResolved',
      templates: {
        en: {
          title: '{titleEn}',
          body: '{bodyEn}',
        },
        cn: {
          title: '{titleCn}',
          body: '{bodyCn}',
        },
      },
    },
    dataKeys: WALKCALC_GROUP_BASE_KEYS,
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
    requiredPayloadKeys: WALKCALC_GROUP_REQUIRED_KEYS,
    localization: {
      strategy: 'serverResolved',
      templates: {
        en: {
          title: '{titleEn}',
          body: '{bodyEn}',
        },
        cn: {
          title: '{titleCn}',
          body: '{bodyCn}',
        },
      },
    },
    dataKeys: WALKCALC_GROUP_BASE_KEYS,
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
    requiredPayloadKeys: WALKCALC_RECORD_REQUIRED_KEYS,
    localization: {
      strategy: 'serverResolved',
      templates: {
        en: {
          title: '{titleEn}',
          body: '{bodyEn}',
        },
        cn: {
          title: '{titleCn}',
          body: '{bodyCn}',
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
    requiredPayloadKeys: WALKCALC_RECORD_REQUIRED_KEYS,
    localization: {
      strategy: 'serverResolved',
      templates: {
        en: {
          title: '{titleEn}',
          body: '{bodyEn}',
        },
        cn: {
          title: '{titleCn}',
          body: '{bodyCn}',
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
    requiredPayloadKeys: WALKCALC_RECORD_REQUIRED_KEYS,
    localization: {
      strategy: 'serverResolved',
      templates: {
        en: {
          title: '{titleEn}',
          body: '{bodyEn}',
        },
        cn: {
          title: '{titleCn}',
          body: '{bodyCn}',
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
      'titleEn',
      'bodyEn',
      'titleCn',
      'bodyCn',
    ],
    localization: {
      strategy: 'serverResolved',
      templates: {
        en: {
          title: '{titleEn}',
          body: '{bodyEn}',
        },
        cn: {
          title: '{titleCn}',
          body: '{bodyCn}',
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
