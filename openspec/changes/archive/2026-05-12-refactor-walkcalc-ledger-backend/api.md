# WalkCalc Ledger Backend API Shapes

This change is intentionally breaking. Native clients should migrate to the new
semantic money contract and should not send or read old `Minor` fields.

## Money Contract

- API money fields are decimal strings: `amount`, `balance`, `expenseShare`,
  `paidTotal`, `settlementIn`, `settlementOut`, `totalBalance`.
- Request amounts must be positive decimal strings with at most two fractional
  digits, for example `12`, `12.3`, or `12.34`.
- Backend storage and calculation use exact integer-cent values internally; the
  `Minor` suffix is not part of the API contract.

## Home

`GET /walkcalc/home/summary`

Response:

```json
{
  "totalBalance": "12.34"
}
```

`totalBalance` is the current user's net balance across every WalkCalc group the
user participates in, including archived groups and groups outside the current
group-list page.

## Groups

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

`GET /walkcalc/groups/my?page=1&pageSize=10&search=trip`

Each group summary includes current-user projection fields:

```json
{
  "code": "AB12",
  "name": "Japan Trip",
  "ownerUserId": "user_1",
  "archivedUserIds": [],
  "isOwner": true,
  "createdAt": 1710000000000,
  "modifiedAt": 1710000000000,
  "currentUserBalance": "10.00",
  "currentUserExpenseShare": "33.34",
  "currentUserPaidTotal": "100.00",
  "currentUserRecordCount": 3
}
```

`GET /walkcalc/groups/:code`

Group detail returns every formal and temporary participant with projection
fields. Formal participant display data is resolved from `UserService` in
`profile`; WalkCalc storage only keeps `userId`.

## Records

`POST /walkcalc/records`

Expense request:

```json
{
  "groupCode": "AB12",
  "type": "expense",
  "amount": "100.00",
  "payerId": "user_1",
  "participantIds": ["user_1", "user_2", "tmp_1"],
  "category": "food",
  "note": "Dinner"
}
```

Settlement request:

```json
{
  "groupCode": "AB12",
  "type": "settlement",
  "amount": "30.00",
  "fromId": "user_2",
  "toId": "user_1"
}
```

Record response:

```json
{
  "recordId": "record_1",
  "groupCode": "AB12",
  "type": "expense",
  "amount": "100.00",
  "payerId": "user_1",
  "participantIds": ["user_1", "user_2"],
  "involvedParticipantIds": ["user_1", "user_2"],
  "category": "food",
  "note": "Dinner",
  "createdAt": 1710000000000,
  "updatedAt": 1710000000000,
  "createdBy": "user_1"
}
```

`POST /walkcalc/records/update` uses the same record request shape plus
`recordId`. The backend reverses the old effects and applies the new effects in
one transaction while preserving the record id.

`POST /walkcalc/records/drop`

```json
{
  "groupCode": "AB12",
  "recordId": "record_1"
}
```

Deletes the record permanently and reverses its projection effects.

`GET /walkcalc/groups/:code/records?page=1&pageSize=10&search=<json>`

Search is backend-side. Supported structured search fields are `note` and
`categoryName`. Totals are computed before pagination.

## Balances

`GET /walkcalc/groups/:code/balances`

Response:

```json
{
  "groupCode": "AB12",
  "participants": [
    {
      "participantId": "user_1",
      "kind": "user",
      "userId": "user_1",
      "profile": { "name": "Hong" },
      "balance": "60.00",
      "expenseShare": "30.00",
      "paidTotal": "90.00",
      "recordCount": 3,
      "settlementIn": "60.00",
      "settlementOut": "0.00"
    }
  ]
}
```

`expenseShare` is consumed expense share only. Settlement records count toward
`recordCount` but do not change `expenseShare`.

`GET /walkcalc/groups/:code/balances/:participantId/records?page=1&pageSize=10`

Returns the selected participant projection plus records where that participant
is involved as payer, split participant, settlement sender, or settlement
receiver. `total` is accurate before pagination.

## Settlement And Archive

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

The backend calculates suggestions from current participant projections. Exact
minimum-transfer strategy is bounded; groups exceeding the configured non-zero
participant limit return `walkcalc.settlementLimitExceeded`.

`POST /walkcalc/groups/:code/settlements/resolve`

The backend re-reads current projections, creates settlement records, updates
projections, and returns the created records plus updated group.

`POST /walkcalc/groups/:code/archive`

Archive succeeds only when every participant in the group has zero balance.
