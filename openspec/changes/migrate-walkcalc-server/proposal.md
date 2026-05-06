## Why

The legacy walkcalc server at `/Users/mehaa/Projects/walkcalc_srv` still carries the group expense-splitting business logic, but this repository already owns the active NestJS server and auth stack. Migrating only the server-side walkcalc implementation into this monorepo lets the product keep its existing business behavior while removing the old Egg.js runtime, legacy login flow, and push-service coupling.

## What Changes

- Add a NestJS walkcalc backend module that ports the legacy group and record behavior from `walkcalc_srv`.
- Add MongoDB schemas and services for walkcalc groups, embedded records, temporary users, member balances, group archive state, and group code generation.
- Expose authenticated walkcalc APIs for creating, joining, listing, reading, archiving, renaming, inviting users to, and deleting groups.
- Expose authenticated walkcalc APIs for adding, deleting, updating, reading, and listing group records while preserving balance recalculation rules.
- Reuse this repository's current auth guard and user identity instead of migrating `/user/login`, `/user/refreshToken`, SSO, WeChat, or legacy JWT wrapping endpoints.
- Reuse the current auth/user service for user profile lookup, search, and current-user metadata needed by walkcalc; do not add duplicate legacy login-related user APIs.
- Do not migrate the legacy push service or APNs key. Invitation, join, and record flows shall complete without sending push notifications.
- Coordinate with frontend changes by keeping the migrated server behavior explicit and stable, while allowing route naming to follow current NestJS conventions.

## Capabilities

### New Capabilities
- `walkcalc-server`: Authenticated expense-group and record management migrated from the legacy walkcalc server, excluding legacy auth and push delivery.

### Modified Capabilities
- None.

## Impact

- Affected code: `packages/server/src/modules/**`, `packages/server/src/app.module.ts`, server DTOs, schemas, services, controllers, i18n messages, and focused tests.
- APIs: new protected walkcalc group/record endpoints; no new legacy login, refresh-token, SSO, WeChat, or push endpoints.
- Data: new MongoDB collection or module-owned schema for walkcalc groups with embedded records and member balance state; user references come from the existing auth/user model.
- Dependencies: prefer existing NestJS, Mongoose, validation, auth, and structured-response infrastructure. Add only small utility dependencies if the migration requires them and a local implementation is not appropriate.
- Systems excluded from migration: legacy Egg.js server runtime, `@hong97/egg-auth`, APNs push service, `app/public/AuthKey_85MLTDWVAK.p8`, old SSO/OAuth services, and frontend implementation changes.
