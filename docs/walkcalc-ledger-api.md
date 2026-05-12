# WalkCalc Ledger Backend API

本文档描述 WalkCalc 新版后端账本接口。该版本是 breaking change：

- 后端是所有金额、统计、余额、settlement suggestion、archive 校验的唯一权威。
- API 暴露 decimal string 金额字段，例如 `amount`, `balance`, `expenseShare`, `paidTotal`。
- 后端内部使用整数分精确计算，但 API 不暴露 `Minor` 字段。
- 旧字段 `paid`, `paidMinor`, `debtMinor`, `costMinor`, `isDebtResolve` 不再是接口契约。
- 旧数据迁移和旧接口兼容不在本版本范围内。

## 通用约定

### Base Path

所有接口路径以 `/walkcalc` 开头。

### Auth

所有 WalkCalc 接口都走当前服务统一认证。请求必须带有效的当前 access token 或 permanent API token。未认证请求会被全局 auth guard 拒绝。

### Response Envelope

业务方法返回的数据会被全局 `StructuredResponseInterceptor` 包装：

成功：

```json
{
  "isSuccess": true,
  "data": {}
}
```

业务错误：

```json
{
  "isSuccess": false,
  "msg": "Group not found or you do not have access",
  "errCode": null,
  "data": null
}
```

本文后续的 Response 示例只展示 `data` 内部结构。客户端实际读取时需要从 envelope 的 `data` 字段取值。

### Money

请求金额：

- 类型必须是 string。
- 格式必须是非负 decimal string，最多两位小数。
- 正金额操作还会拒绝 `0`, `0.0`, `0.00`。
- 合法示例：`"1"`, `"1.2"`, `"1.23"`, `"0.01"`。
- 非法示例：`1`, `"01.00"`, `"-1.00"`, `"1.234"`, `"abc"`, `"0.00"`。

响应金额：

- 一律是两位小数 decimal string。
- 示例：`"0.00"`, `"12.30"`, `"-4.56"`。

### Pagination

列表接口通用 query：

| Field | Type | Default | Constraint |
| --- | --- | --- | --- |
| `page` | number | `1` | integer, `>= 1` |
| `pageSize` | number | `10` | integer, `>= 1`, `<= 100` |

分页响应：

```json
{
  "data": [],
  "total": 0,
  "page": 1,
  "pageSize": 10
}
```

`total` 是过滤后、分页前的准确总数。

## Field Semantics

### Participant

```ts
type WalkcalcParticipantKind = "user" | "tempUser"
```

| Field | Meaning |
| --- | --- |
| `participantId` | 账本参与人 id。正式用户通常等于 `userId`；临时用户为后端生成 id。 |
| `kind` | `user` 表示正式用户，`tempUser` 表示 group-local 临时用户。 |
| `userId` | 正式用户 id。临时用户没有。 |
| `tempName` | 临时用户展示名。正式用户没有。 |
| `profile` | 正式用户展示信息，由 `UserService` 实时解析，不在 WalkCalc participant 存储里复制。 |

### Projection

每个 group participant 都有一条 projection，作为余额和统计的权威读模型。

| Field | Meaning |
| --- | --- |
| `balance` | 净额。正数表示该参与人应收，负数表示该参与人应付。 |
| `expenseShare` | 实际消费分摊总额。只由 expense record 增加，settlement 不会影响它。 |
| `paidTotal` | 作为 expense payer 实际垫付的总额。settlement 不计入。 |
| `recordCount` | 参与过的 record 总数。expense 和 settlement 都计入，每条 record 对同一 participant 只计一次。 |
| `settlementIn` | 作为 settlement receiver 收到的转账总额。 |
| `settlementOut` | 作为 settlement sender 转出的转账总额。 |

### Record

```ts
type WalkcalcRecordType = "expense" | "settlement"
```

Expense record：

- `amount > 0`
- 必须有 `payerId`
- 必须有非空 `participantIds`
- 影响 `balance`, `expenseShare`, `paidTotal`, `recordCount`

Settlement record：

- `amount > 0`
- 必须有 `fromId`, `toId`
- `fromId !== toId`
- 影响 `balance`, `settlementIn`, `settlementOut`, `recordCount`
- 不影响 `expenseShare`

## Common DTOs

### WalkcalcPublicUser

```json
{
  "userId": "user_1",
  "profile": {
    "name": "Hong",
    "avatar": "https://example.com/avatar.png"
  }
}
```

`profile` 结构来自当前 user module，客户端应按现有 user profile 结构消费。

### WalkcalcParticipantProjection

```json
{
  "participantId": "user_1",
  "kind": "user",
  "userId": "user_1",
  "profile": {
    "name": "Hong",
    "avatar": "https://example.com/avatar.png"
  },
  "balance": "66.66",
  "expenseShare": "33.34",
  "paidTotal": "100.00",
  "recordCount": 1,
  "settlementIn": "0.00",
  "settlementOut": "0.00"
}
```

临时用户示例：

```json
{
  "participantId": "tmp_1",
  "kind": "tempUser",
  "tempName": "Guest",
  "balance": "-33.33",
  "expenseShare": "33.33",
  "paidTotal": "0.00",
  "recordCount": 1,
  "settlementIn": "0.00",
  "settlementOut": "0.00"
}
```

### WalkcalcRecord

Expense response：

```json
{
  "recordId": "record_1",
  "groupCode": "AB12",
  "type": "expense",
  "amount": "100.00",
  "payerId": "user_1",
  "participantIds": ["user_1", "user_2", "tmp_1"],
  "involvedParticipantIds": ["user_1", "user_2", "tmp_1"],
  "category": "food",
  "note": "Dinner",
  "long": "121.4737",
  "lat": "31.2304",
  "createdAt": 1710000000000,
  "updatedAt": 1710000000000,
  "createdBy": "user_1",
  "updatedBy": "user_1"
}
```

Settlement response：

```json
{
  "recordId": "record_2",
  "groupCode": "AB12",
  "type": "settlement",
  "amount": "30.00",
  "fromId": "user_2",
  "toId": "user_1",
  "involvedParticipantIds": ["user_2", "user_1"],
  "category": "settlement",
  "createdAt": 1710000000000,
  "updatedAt": 1710000000000,
  "createdBy": "user_1"
}
```

## User APIs

### Get Current WalkCalc User

`GET /walkcalc/users/me`

Response:

```json
{
  "userId": "user_1",
  "profile": {
    "name": "Hong"
  }
}
```

### Lookup Users By IDs

`POST /walkcalc/users`

Request:

```json
{
  "userIds": ["user_1", "user_2"]
}
```

Validation:

- `userIds` must be an array.
- max length: `100`.
- every item must be string.

Response:

```json
[
  {
    "userId": "user_1",
    "profile": {
      "name": "Hong"
    }
  }
]
```

### Search Users

`GET /walkcalc/users/search?name=hong`

Rules:

- Empty `name` returns `[]`.
- Non-empty search returns at most `10` public users.

Response:

```json
[
  {
    "userId": "user_1",
    "profile": {
      "name": "Hong"
    }
  }
]
```

## Home API

### Home Summary

`GET /walkcalc/home/summary`

Response:

```json
{
  "totalBalance": "12.34"
}
```

Semantics:

- `totalBalance` 是当前用户在所有参与 group 中的净额总和。
- 包括 archived groups。
- 包括未被当前 group pagination 加载到的 groups。

## Group APIs

### Create Group

`POST /walkcalc/groups`

Request:

```json
{
  "name": "Japan Trip"
}
```

Response:

```json
{
  "code": "AB12"
}
```

Effects:

- 创建 group metadata。
- 当前用户成为 owner。
- 当前用户被创建为 formal participant。
- 当前用户 projection 初始化为 zero values。

### Join Group

`POST /walkcalc/groups/join`

Request:

```json
{
  "code": "AB12"
}
```

Response:

```json
{
  "code": "AB12"
}
```

Errors:

- duplicate join: `walkcalc.userAlreadyInGroup`
- group not found: `walkcalc.groupNotFound`

### List My Groups

`GET /walkcalc/groups/my?page=1&pageSize=10&search=trip`

Query:

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `page` | number | no | default `1`, max page size applies through `pageSize` |
| `pageSize` | number | no | default `10`, max `100` |
| `search` | string | no | matches group `name` or `code`, backend escaped regex |

Response:

```json
{
  "data": [
    {
      "code": "AB12",
      "name": "Japan Trip",
      "ownerUserId": "user_1",
      "archivedUserIds": ["user_1"],
      "isOwner": true,
      "createdAt": 1710000000000,
      "modifiedAt": 1710000000000,
      "currentUserBalance": "10.00",
      "currentUserExpenseShare": "33.34",
      "currentUserPaidTotal": "100.00",
      "currentUserRecordCount": 2
    }
  ],
  "total": 1,
  "page": 1,
  "pageSize": 10
}
```

Semantics:

- 只返回当前用户作为 formal participant 加入的 groups。
- 按 `modifiedAt` 倒序。
- 每个 group summary 的当前用户余额来自 projection，不依赖客户端已加载 records。

### Get Group Detail

`GET /walkcalc/groups/:code`

Response:

```json
{
  "code": "AB12",
  "name": "Japan Trip",
  "ownerUserId": "user_1",
  "archivedUserIds": [],
  "isOwner": true,
  "createdAt": 1710000000000,
  "modifiedAt": 1710000000000,
  "participants": []
}
```

`participants` is `WalkcalcParticipantProjection[]`.

Authorization:

- group owner or member can read。
- non-member returns `walkcalc.groupNotFoundOrNoAccess`。

### Dismiss Group

`DELETE /walkcalc/groups/:code`

Response:

```json
{
  "code": "AB12"
}
```

Rules:

- owner only。
- group is removed from normal WalkCalc access。
- non-owner returns `walkcalc.groupOwnerRequired`。

### Add Temporary User

`POST /walkcalc/groups/:code/temp-users`

Request:

```json
{
  "name": "Guest"
}
```

Response:

```json
{
  "participantId": "tmp_1",
  "kind": "tempUser",
  "tempName": "Guest"
}
```

Rules:

- owner only。
- temporary user name must be unique within the group。
- new temp user gets zero projection。

### Invite Formal Users

`POST /walkcalc/groups/:code/invite`

Request:

```json
{
  "userIds": ["user_2", "user_3"]
}
```

Validation:

- `userIds` must be a non-empty string array。
- max length: `100`。

Response:

```json
{
  "code": "AB12",
  "userIds": ["user_2"]
}
```

Semantics:

- owner or member can invite。
- already joined users are skipped。
- unknown users are ignored by `UserService.findPublicUsersByIds` result。
- each newly invited formal user gets zero projection。

### Archive Group

`POST /walkcalc/groups/:code/archive`

Response:

```json
{
  "code": "AB12"
}
```

Rules:

- owner or member can archive for self。
- backend rejects archive unless every participant balance in this group is `0.00`。
- if any participant remains unsettled, returns `walkcalc.groupUnsettled` and archive state is unchanged。

### Unarchive Group

`POST /walkcalc/groups/:code/unarchive`

Response:

```json
{
  "code": "AB12"
}
```

Rules:

- owner or member can unarchive self。
- no balance requirement。

### Rename Group

`PATCH /walkcalc/groups/:code/name`

Request:

```json
{
  "name": "Next Trip"
}
```

Response:

```json
{
  "code": "AB12",
  "name": "Next Trip"
}
```

Rules:

- owner only。

## Record APIs

### Add Expense Record

`POST /walkcalc/records`

Request:

```json
{
  "groupCode": "AB12",
  "type": "expense",
  "amount": "100.00",
  "payerId": "user_1",
  "participantIds": ["user_1", "user_2", "tmp_1"],
  "category": "food",
  "note": "Dinner",
  "long": "121.4737",
  "lat": "31.2304",
  "createdAt": 1710000000000
}
```

Validation:

- `type` must be `"expense"`。
- `amount` must be positive money string。
- `payerId` is required。
- `participantIds` is required, non-empty, max length `200`。
- every involved participant must exist in the group。
- duplicate `participantIds` are rejected。

Response:

```json
{
  "record": {},
  "group": {}
}
```

`record` is `WalkcalcRecord`; `group` is updated `WalkcalcGroup`.

Projection effects:

- amount is split exactly across `participantIds`。
- each split participant:
  - `balance -= splitShare`
  - `expenseShare += splitShare`
  - `recordCount += 1`
- payer:
  - `balance += amount`
  - `paidTotal += amount`
  - `recordCount += 1` only if payer is not already in `participantIds`
- group `modifiedAt` updates。

### Add Settlement Record

`POST /walkcalc/records`

Request:

```json
{
  "groupCode": "AB12",
  "type": "settlement",
  "amount": "30.00",
  "fromId": "user_2",
  "toId": "user_1",
  "note": "Transfer"
}
```

Validation:

- `type` must be `"settlement"`。
- `amount` must be positive money string。
- `fromId` and `toId` are required。
- `fromId !== toId`。
- both participants must exist in the group。

Projection effects:

- sender `fromId`:
  - `balance += amount`
  - `settlementOut += amount`
  - `recordCount += 1`
- receiver `toId`:
  - `balance -= amount`
  - `settlementIn += amount`
  - `recordCount += 1`
- `expenseShare` is unchanged。
- group `modifiedAt` updates。

Notes:

- Direct settlement creation is supported by the backend record API。
- Product flow should normally use settlement suggestion + resolve so settlement is based on current backend projections。

### Update Record

`POST /walkcalc/records/update`

Request uses the same shape as add record, plus `recordId`.

Expense update example:

```json
{
  "groupCode": "AB12",
  "recordId": "record_1",
  "type": "expense",
  "amount": "120.00",
  "payerId": "user_2",
  "participantIds": ["user_1", "user_2"],
  "category": "traffic",
  "note": "Taxi"
}
```

Settlement update example:

```json
{
  "groupCode": "AB12",
  "recordId": "record_2",
  "type": "settlement",
  "amount": "20.00",
  "fromId": "user_2",
  "toId": "user_1"
}
```

Response:

```json
{
  "record": {},
  "group": {}
}
```

Semantics:

- backend loads the old record。
- reverses old projection effects。
- replaces record fields while preserving `recordId`。
- applies new projection effects。
- updates `updatedAt`, `updatedBy`, and group `modifiedAt`。
- all steps run in one transaction where supported。

### Delete Record

`POST /walkcalc/records/drop`

Request:

```json
{
  "groupCode": "AB12",
  "recordId": "record_1"
}
```

Response:

```json
{
  "groupCode": "AB12",
  "recordId": "record_1",
  "group": {}
}
```

Semantics:

- hard delete。
- backend reverses the record projection effects before deleting。
- deleted record does not appear in normal record queries。
- missing record returns `walkcalc.recordNotFound`。

### Get Record

`GET /walkcalc/records/:recordId`

Response:

```json
{
  "recordId": "record_1",
  "groupCode": "AB12",
  "type": "expense",
  "amount": "100.00",
  "payerId": "user_1",
  "participantIds": ["user_1", "user_2"],
  "involvedParticipantIds": ["user_1", "user_2"],
  "createdAt": 1710000000000,
  "updatedAt": 1710000000000,
  "createdBy": "user_1"
}
```

Authorization:

- current user must be a member of the record's group。

### List Group Records

`GET /walkcalc/groups/:code/records?page=1&pageSize=10&search=<encoded-json>`

Response:

```json
{
  "data": [],
  "total": 0,
  "page": 1,
  "pageSize": 10
}
```

`data` is `WalkcalcRecord[]`.

Sorting:

- newest first by `createdAt desc`。

### Record Search

`search` is an optional URL-encoded JSON string:

```json
{
  "operator": "or",
  "conditions": [
    {
      "field": "note",
      "query": "dinner"
    },
    {
      "field": "categoryName",
      "query": "meal"
    }
  ]
}
```

Supported fields:

| Field | Meaning |
| --- | --- |
| `note` | case-insensitive escaped regex match against `record.note` |
| `categoryName` | maps localized/category aliases to stored `category` ids |

Supported operators:

- `or`
- `and`

Category alias search currently supports:

| Category | Aliases |
| --- | --- |
| `food` | `meal`, `餐饮` |
| `beverage` | `drink`, `饮品` |
| `accommodation` | `hotel`, `酒店` |
| `shopping` | `shopping`, `购物` |
| `traffic` | `transport`, `交通` |
| `stay` | `stay`, `住宿` |
| `vacation` | `vacation`, `旅行` |
| `transfer` | `transfer`, `转账` |
| `ticket` | `ticket`, `票务` |
| `game` | `game`, `娱乐` |
| `other` | `other`, `其他` |
| `settlement` | `transfer`, `转账` |

Invalid search JSON or unsupported fields return `walkcalc.invalidRecordSearch`。

## Balance APIs

### List Group Balances

`GET /walkcalc/groups/:code/balances`

Response:

```json
{
  "groupCode": "AB12",
  "participants": []
}
```

`participants` is `WalkcalcParticipantProjection[]`.

Semantics:

- returns every formal and temporary participant。
- values come from backend projections。
- record counts include all records from all pages。
- settlement records are included in `recordCount`。

### Participant Balance Detail

`GET /walkcalc/groups/:code/balances/:participantId/records?page=1&pageSize=10&search=<encoded-json>`

Response:

```json
{
  "participantId": "user_2",
  "kind": "user",
  "userId": "user_2",
  "profile": {
    "name": "Ada"
  },
  "balance": "-30.00",
  "expenseShare": "30.00",
  "paidTotal": "0.00",
  "recordCount": 2,
  "settlementIn": "0.00",
  "settlementOut": "30.00",
  "records": [],
  "total": 2,
  "page": 1,
  "pageSize": 10
}
```

Record filter semantics:

- expense payer matches。
- expense split participant matches。
- settlement sender matches。
- settlement receiver matches。
- backend filters through `involvedParticipantIds`。
- `total` is accurate before pagination。

## Settlement APIs

### Settlement Suggestion

`GET /walkcalc/groups/:code/settlement-suggestion`

Response:

```json
{
  "groupCode": "AB12",
  "strategy": "exact",
  "transfers": [
    {
      "fromId": "user_2",
      "toId": "user_1",
      "amount": "30.00"
    }
  ]
}
```

Semantics:

- backend reads current participant projections。
- participants with negative `balance` pay participants with positive `balance`。
- applying returned transfers would make all balances zero。
- exact minimum-transfer algorithm is used up to the configured non-zero participant limit。
- current limit: `12` non-zero participants。
- exceeding the limit returns `walkcalc.settlementLimitExceeded`。
- client-provided balances or records are ignored。

### Resolve Settlements

`POST /walkcalc/groups/:code/settlements/resolve`

Request:

```json
{}
```

The DTO currently allows an optional `transfers` array, but the implementation recomputes settlement from current backend projections and does not trust client-submitted transfer plans.

Response:

```json
{
  "records": [],
  "group": {}
}
```

`records` is the settlement records created by this operation. `group` is updated group detail.

Semantics:

- backend loads current projections inside the mutation flow。
- recomputes exact settlement suggestion。
- creates settlement records。
- applies projection effects。
- if there is no concurrent change and suggestion covers all balances, every participant `balance` becomes `0.00`。
- settlement records count toward `recordCount` but do not change `expenseShare`。

## Error Keys

Common WalkCalc business error keys:

| Key | Meaning |
| --- | --- |
| `walkcalc.userNotFound` | user does not exist |
| `walkcalc.groupNotFound` | group does not exist |
| `walkcalc.groupNotFoundOrNoAccess` | group missing or current user is not a member |
| `walkcalc.groupOwnerRequired` | operation requires group owner |
| `walkcalc.userAlreadyInGroup` | duplicate join |
| `walkcalc.tempUserNameExists` | duplicate temporary user name |
| `walkcalc.forWhomRequired` | expense participant list is empty |
| `walkcalc.groupCodeUnavailable` | group code generation exhausted retries |
| `walkcalc.recordNotFound` | record does not exist |
| `walkcalc.invalidParticipant` | participant id invalid or not in group |
| `walkcalc.invalidRecordSearch` | search JSON shape is invalid |
| `walkcalc.invalidRecordType` | record type is not supported |
| `walkcalc.invalidMoneyAmount` | amount is invalid or non-positive |
| `walkcalc.invalidProjectionState` | projection would become invalid, for example negative record count |
| `walkcalc.groupUnsettled` | archive rejected because at least one participant balance is non-zero |
| `walkcalc.settlementLimitExceeded` | exact settlement has too many non-zero participants |

## Endpoint Summary

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/walkcalc/users/me` | current WalkCalc user |
| `POST` | `/walkcalc/users` | lookup users by ids |
| `GET` | `/walkcalc/users/search` | search users by display name |
| `GET` | `/walkcalc/home/summary` | home total balance |
| `POST` | `/walkcalc/groups` | create group |
| `POST` | `/walkcalc/groups/join` | join group |
| `GET` | `/walkcalc/groups/my` | list my groups |
| `GET` | `/walkcalc/groups/:code` | group detail |
| `DELETE` | `/walkcalc/groups/:code` | dismiss group |
| `POST` | `/walkcalc/groups/:code/temp-users` | add temporary user |
| `POST` | `/walkcalc/groups/:code/invite` | invite formal users |
| `POST` | `/walkcalc/groups/:code/archive` | archive group for current user |
| `POST` | `/walkcalc/groups/:code/unarchive` | unarchive group for current user |
| `PATCH` | `/walkcalc/groups/:code/name` | rename group |
| `POST` | `/walkcalc/records` | add expense or settlement record |
| `POST` | `/walkcalc/records/update` | update record |
| `POST` | `/walkcalc/records/drop` | hard delete record |
| `GET` | `/walkcalc/records/:recordId` | read record |
| `GET` | `/walkcalc/groups/:code/records` | list/search group records |
| `GET` | `/walkcalc/groups/:code/balances` | list participant balances |
| `GET` | `/walkcalc/groups/:code/balances/:participantId/records` | participant balance detail and records |
| `GET` | `/walkcalc/groups/:code/settlement-suggestion` | backend settlement suggestion |
| `POST` | `/walkcalc/groups/:code/settlements/resolve` | create backend settlement records |
