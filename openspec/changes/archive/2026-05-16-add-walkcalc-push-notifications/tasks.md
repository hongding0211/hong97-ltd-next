## 1. Integration Setup

- [x] 1.1 Confirm the walkcalc backend module is present on the implementation branch and imported alongside `PushModule`.
- [x] 1.2 Add a walkcalc push configuration constant or config lookup for the walkcalc `appId`.
- [x] 1.3 Inject `PushService` into walkcalc-side push orchestration without exposing any public notification sending endpoint.

## 2. Notification Catalog

- [x] 2.1 Add catalog entries for `walkcalc.group.invited`, `walkcalc.group.member-joined`, and `walkcalc.group.dismissed`.
- [x] 2.2 Add catalog entries for `walkcalc.record.created`, `walkcalc.record.updated`, `walkcalc.record.deleted`, and `walkcalc.debts.resolved`.
- [x] 2.3 Add or reuse a silent `walkcalc.sync.requested` catalog entry with required `syncId`, `groupCode`, and `updateKind`.
- [x] 2.4 Add tests that required walkcalc payload fields are validated and APNs alert/silent payloads render correctly.

## 3. Recipient Resolution

- [x] 3.1 Implement helpers to derive formal member IDs from a walkcalc group and ignore temporary user IDs as push recipients.
- [x] 3.2 Implement alert recipient calculation for invite, join, dismiss, record add/update/delete, and bulk debt resolution.
- [x] 3.3 Implement silent sync recipient calculation for group changes and record changes, excluding users already receiving a visible alert for the same event.
- [x] 3.4 Deduplicate recipients so each formal user receives at most one notification per event and the actor receives no visible self-alert.

## 4. Walkcalc Mutation Hooks

- [x] 4.1 Dispatch group invitation push after invited users are persisted.
- [x] 4.2 Dispatch member-joined push after join succeeds.
- [x] 4.3 Dispatch silent sync for temporary-user creation and group rename after persistence succeeds.
- [x] 4.4 Dispatch group-dismissed push after the owner dismisses a group.
- [x] 4.5 Dispatch record-created push after add-record persistence succeeds.
- [x] 4.6 Dispatch record-updated push using the union of previous and updated record participants after update succeeds.
- [x] 4.7 Dispatch record-deleted push using the deleted record participant context after delete succeeds.
- [x] 4.8 Dispatch debts-resolved push using accepted transfer participants after bulk resolution succeeds.
- [x] 4.9 Keep create-group and archive/unarchive flows push-free.

## 5. Failure Semantics and Observability

- [x] 5.1 Ensure push dispatch runs after successful save/transaction and does not run for rejected mutations.
- [x] 5.2 Catch and log `PushService` errors and non-accepted delivery summaries without changing the successful walkcalc API response.
- [x] 5.3 Treat `no-destination` results as non-fatal and keep invalid-token cleanup delegated to `PushService`.

## 6. Tests and Validation

- [x] 6.1 Add unit tests for invite/join/dismiss recipient behavior, including actor exclusion and temporary-user exclusion.
- [x] 6.2 Add unit tests for record add/update/delete/debt-resolution affected-recipient behavior.
- [x] 6.3 Add unit tests that silent sync is sent to non-alert formal members and not duplicated for alert recipients.
- [x] 6.4 Add tests that push failures do not reject walkcalc mutations.
- [x] 6.5 Run the relevant server test suite and OpenSpec validation for `add-walkcalc-push-notifications`.
