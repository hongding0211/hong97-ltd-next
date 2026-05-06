## Context

The legacy implementation lives in `/Users/mehaa/Projects/walkcalc_srv` as an Egg.js application with route/controller/service/model files for users, groups, records, SSO login, token wrapping, and APNs push notifications. This repository's active server is a NestJS package at `packages/server`, with global Mongoose, JWT/auth guards, `@UserId()`, structured responses, i18n-backed `GeneralException`, and an existing `UserModule`.

The migration target is the walkcalc business server only. Authentication must come from the current server's auth flow, user profile data must come from the current auth/user model and service, and frontend routes/callers will be updated separately.

## Goals / Non-Goals

**Goals:**
- Port the group and record business behavior into a NestJS `WalkcalcModule`.
- Preserve important legacy behavior: group code generation, owner/member authorization, temporary users, archived groups per user, member debt/cost balances, embedded records, record limits, and add/drop/update balance reversals.
- Use the current authenticated user id as the canonical formal-member identity.
- Provide focused user lookup/search helpers needed by walkcalc through the existing user service instead of recreating legacy login endpoints.
- Remove push-notification side effects from join, invite, and record flows.
- Add tests around debt math, authorization, and excluded legacy auth/push behavior.

**Non-Goals:**
- Migrating the Egg.js runtime or keeping route/controller code in CommonJS.
- Migrating `/user/login`, `/user/refreshToken`, SSO, WeChat, legacy JWT wrapping, or `@hong97/egg-auth`.
- Migrating APNs push, Bark integration for walkcalc notifications, or `app/public/AuthKey_85MLTDWVAK.p8`.
- Implementing frontend changes in this OpenSpec change.
- Performing a production data backfill unless explicitly requested later.

## Decisions

1. **Implement walkcalc as a dedicated NestJS module.**
   - Decision: add `packages/server/src/modules/walkcalc` with group and record controllers/services, DTOs, schemas, and module registration in `AppModule`.
   - Rationale: this matches the repository's existing module structure and keeps expense-splitting code isolated from blog/trash/ucp/auth modules.
   - Alternative considered: fold the code into the existing `UserModule` plus loose controllers. That would blur ownership and make testing debt logic harder.

2. **Use current auth identities instead of legacy user ids.**
   - Decision: protected walkcalc endpoints receive the current user through `@UserId()` and store formal group members by the current user model's `userId`; response user projections use `UserService`.
   - Rationale: the current auth token subject is already the server-wide identity and avoids rebuilding the legacy `uuid/source/source_uid` login model.
   - Alternative considered: create a separate migrated walkcalc user collection. That would duplicate identity state and conflict with the user's requirement to use the new auth/user service.

3. **Keep a walkcalc-specific user-facing member id in responses.**
   - Decision: formal members in request/response payloads use existing `userId`; temporary users use generated UUIDs. The services validate whether a participant id is a formal user or temporary user before changing balances.
   - Rationale: this preserves the legacy distinction between formal users and temp users without relying on Mongo ObjectId values from the old app.
   - Alternative considered: expose Mongo `_id` values. That is inconsistent with current user DTOs and leaks persistence details.

4. **Model groups with embedded records and balance arrays.**
   - Decision: create a walkcalc group schema with `code`, `ownerUserId`, `name`, `members`, `tempUsers`, `records`, `archivedUserIds`, `createdAt`, and `modifiedAt`.
   - Rationale: the legacy implementation relies on atomic updates to embedded members/tempUsers/records. Keeping the same aggregate shape minimizes behavior changes during migration.
   - Alternative considered: normalize records into a separate collection immediately. That may be cleaner later, but it makes parity with legacy balance reversal behavior riskier for this migration.

5. **Make route names NestJS-native and frontend-adjustable.**
   - Decision: expose protected endpoints under a walkcalc namespace such as `/walkcalc/groups` and `/walkcalc/records`, using RESTful verbs where practical.
   - Rationale: the user stated the frontend will change, so the migration does not need to preserve old `/group/*` and `/record/*` paths exactly.
   - Alternative considered: exact legacy path compatibility. That would preserve old quirks and increase collision risk with existing server APIs without a frontend compatibility requirement.

6. **Remove push side effects completely.**
   - Decision: do not call Bark/APNs or add a replacement notification adapter from walkcalc flows. Invites, joins, and records only mutate and return data.
   - Rationale: push service migration is explicitly out of scope and the legacy APNs key must not be copied.
   - Alternative considered: emit domain events for later push integration. That adds integration surface before there is a concrete push requirement.

7. **Use transactions where balance and record updates span multiple fields.**
   - Decision: implement add/drop/update record operations so balance adjustments and record mutations happen in one service operation, using Mongo transactions when the configured connection supports sessions.
   - Rationale: the legacy service performs many sequential updates; moving to NestJS is an opportunity to avoid partial debt/cost changes.
   - Alternative considered: preserve exact multi-update behavior. That is simpler but risks corrupted balances on mid-operation failures.

## Risks / Trade-offs

- User-id mismatch between legacy data and current auth users -> avoid automatic production backfill in this change and document any later migration mapping separately.
- Embedded records can grow large -> preserve the legacy 5,000-record group limit and paginate group record responses.
- Transaction availability depends on MongoDB deployment mode -> keep balance mutation logic centralized so it can fall back deliberately if sessions are unavailable.
- Route names will change from the old server -> frontend migration must be coordinated with the new route contract.
- Removing push notifications changes side effects -> make tests assert that walkcalc flows do not depend on push services.
- Legacy `totalDebt` lived on the old user document -> compute or store walkcalc debt through walkcalc-owned data instead of adding old fields to the auth user model unless implementation proves a current-user summary cache is required.
