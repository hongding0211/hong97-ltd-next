## 1. Module And Data Model

- [x] 1.1 Create `WalkcalcModule` under `packages/server/src/modules/walkcalc` and register it in `AppModule`.
- [x] 1.2 Add walkcalc group schema with group code, owner user id, members, temporary users, archived user ids, embedded records, created time, and modified time.
- [x] 1.3 Add DTOs for group create/join/read/list/archive/rename/invite/temp-user operations using the repository's existing validation style.
- [x] 1.4 Add DTOs for record add/drop/update/read/list operations, including optional record metadata fields from the legacy server.
- [x] 1.5 Port the legacy 4-character group code generator into a scoped walkcalc utility with focused unit tests.

## 2. User Integration

- [x] 2.1 Extend or wrap `UserService` with walkcalc-safe public profile lookup by current `userId`.
- [x] 2.2 Add bounded user search by profile display name without exposing auth provider secrets, password hashes, or private auth data.
- [x] 2.3 Add current-user profile and multi-user lookup endpoints needed by the frontend, protected by current auth.
- [x] 2.4 Confirm no migrated legacy `/user/login`, `/user/refreshToken`, SSO, WeChat, or token-wrapping endpoints are added.

## 3. Group Behavior

- [x] 3.1 Implement group creation with current user as owner/member and generated unique join code.
- [x] 3.2 Implement group join with duplicate-member and missing-group validation.
- [x] 3.3 Implement owner-only group dismiss.
- [x] 3.4 Implement owner-only temporary user creation with unique group-local temporary user names.
- [x] 3.5 Implement invite flow for existing current users, excluding users already in the group.
- [x] 3.6 Implement paginated "my groups" listing sorted by modified time with member public profiles and debt/cost data.
- [x] 3.7 Implement group detail lookup with owner/member authorization, `isOwner`, member data, temporary users, and archive state.
- [x] 3.8 Implement per-user archive/unarchive and owner-only rename.
- [x] 3.9 Ensure group flows do not call APNs, Bark, or any migrated push service.

## 4. Record Behavior

- [x] 4.1 Implement centralized participant resolution for formal current users and group-local temporary users.
- [x] 4.2 Implement record add with group membership authorization, non-empty `forWhom`, non-zero amount, 5,000-record limit, generated `recordId`, balance updates, and modified time updates.
- [x] 4.3 Implement record drop with balance reversal and missing-record validation.
- [x] 4.4 Implement record update by reversing the previous normal record, applying the new record, updating modifier metadata, and rejecting debt-resolution record updates.
- [x] 4.5 Implement record read by `recordId` with owner/member authorization and no database-internal fields in the response.
- [x] 4.6 Implement paginated group record listing sorted by newest creation time first.
- [x] 4.7 Keep balance and record mutations in one service operation, using Mongo sessions/transactions where supported by the configured connection.
- [x] 4.8 Ensure record flows do not call APNs, Bark, or any migrated push service.

## 5. Errors, Responses, And I18n

- [x] 5.1 Map expected walkcalc validation and authorization failures to `GeneralException` messages compatible with the structured-response interceptor.
- [x] 5.2 Add Chinese and English i18n keys for walkcalc errors.
- [x] 5.3 Verify successful controller results use the repository's standard `{ isSuccess: true, data }` envelope through the existing interceptor.

## 6. Verification

- [x] 6.1 Add unit tests for group code generation, group authorization rules, and user-helper projections.
- [x] 6.2 Add service tests for record add/drop/update debt and cost calculations covering formal and temporary users.
- [x] 6.3 Add controller or e2e tests proving unauthenticated walkcalc requests are rejected.
- [x] 6.4 Add regression tests proving legacy auth endpoints and push service behavior are not introduced by the migration.
- [x] 6.5 Run the server test suite and targeted build/lint checks for `packages/server`.
