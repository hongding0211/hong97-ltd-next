## Context

WalkCalc currently stores group metadata, members, temporary users, balance totals, and every record inside one Mongo document. That shape was useful for migration parity, but it makes all record pagination, participant record totals, home totals, balances, and settlement suggestions depend on loading large group aggregates or on the native client reducing only the data it has already fetched.

This change is a breaking backend redesign. Existing WalkCalc data is abandoned, so the implementation does not need dual reads, field compatibility, or data backfills for old `paidMinor`, `debtMinor`, or `costMinor` documents. The current server auth and user service remain the source of formal user identity and public profile data.

## Goals / Non-Goals

**Goals:**
- Make the backend the only authority for money math, participant statistics, home totals, balance details, settlement suggestions, and archive eligibility.
- Expose money as decimal strings in API DTOs while keeping exact integer-cent arithmetic inside the backend.
- Separate group metadata, participants, records, and participant projections so reads can use indexes instead of in-memory filtering of embedded arrays.
- Keep record add, update, and hard delete user-friendly while applying projection changes transactionally.
- Support formal users and temporary users as equal accounting participants.
- Resolve formal user names and avatars through `UserService` at response time instead of copying profile data into WalkCalc storage.
- Preserve enough flexibility for future analytics such as expense share, paid total, settlement in/out, and participant record counts.
- Ship with strict backend unit and controller tests that prove exact money math, mutation atomicity, projection correctness, query totals, settlement behavior, and breaking API contract changes.

**Non-Goals:**
- Migrating old WalkCalc documents or supporting old `Minor` response fields.
- Implementing native client changes in this backend proposal.
- Adding audit logs, soft delete, record restore, push notifications, or payment-provider integration.
- Replacing the existing server-wide auth mechanism or user profile storage.

## Decisions

1. **Use semantic money names in APIs and internal exact money values in storage.**
   - Decision: request and response DTOs expose decimal strings such as `amount`, `balance`, `expenseShare`, and `paidTotal`. The backend parses them into a `Money` helper that stores exact integer cents internally, formats canonical two-decimal strings, validates positive amounts, and splits cents deterministically.
   - Storage may use internal fields such as `amountValue`, `balanceValue`, and `expenseShareValue` backed by BSON Decimal128 or another exact integer-cent representation. These storage fields are not serialized directly.
   - Rationale: `Minor` was an implementation detail for precision, not a business term. Decimal strings keep the API clear and avoid JavaScript floating-point errors.
   - Alternative considered: keep `amountMinor` in API DTOs. That is precise but leaks technical naming into every client and makes the product vocabulary harder to understand.

2. **Normalize WalkCalc ledger collections.**
   - Decision: replace the embedded group aggregate with separate collections:
     - `walkcalc_groups`: group code, owner user id, name, archive/deletion metadata, timestamps.
     - `walkcalc_participants`: group code, participant id, kind (`user` or `tempUser`), user id for formal users, temp name for temp users, timestamps.
     - `walkcalc_records`: one document per expense or settlement record.
     - `walkcalc_participant_projections`: one document per participant per group with current balance and statistics.
   - Rationale: record and balance reads become indexed collection queries, and write contention no longer grows with record array size.
   - Alternative considered: keep embedded records but add backend aggregate endpoints. That fixes some client bugs, but it keeps the same scaling problem and continues to require loading the full group for record filtering.

3. **Store profile references, not formal user display copies.**
   - Decision: formal participants store `userId`; list/detail/balance responses batch-load public profile data from `UserService`. Temporary users store only group-local display fields such as `tempName`.
   - Rationale: profile data already belongs to the user module. Duplicating name/avatar in WalkCalc creates stale copies and makes profile changes harder to reflect.
   - Alternative considered: copy profile snapshots into participants for faster response mapping. That optimizes one read path at the cost of consistency and extra update complexity.

4. **Use participant projections as authoritative materialized state.**
   - Decision: `walkcalc_participant_projections` stores:
     - `balanceValue`: net amount; positive means receivable, negative means payable.
     - `expenseShareValue`: actual consumed expense share, only from expense records.
     - `paidTotalValue`: total amount paid as an expense payer.
     - `recordCount`: records involving the participant; settlement records count.
     - `settlementInValue` and `settlementOutValue`: optional transfer totals.
   - The projection document also duplicates `userId` for formal users so home total balance can aggregate by user without joining participants.
   - Rationale: balances and statistics must be accurate for all records, including records not loaded by the client.
   - Alternative considered: calculate every balance and statistic from records on demand. That is simpler but expensive for group lists, home totals, and balance views.

5. **Use indexed query shapes for client consumption.**
   - Decision: record documents maintain `involvedParticipantIds`, containing the unique participant ids involved in the record. Expense records include the payer and every split participant; settlement records include from and to.
   - Required indexes:
     - groups: `{ code: 1 }` unique, `{ ownerUserId: 1 }`, `{ modifiedAt: -1 }`
     - participants: `{ groupCode: 1, participantId: 1 }` unique, `{ userId: 1, groupCode: 1 }`
     - records: `{ groupCode: 1, createdAt: -1 }`, `{ groupCode: 1, involvedParticipantIds: 1, createdAt: -1 }`, `{ groupCode: 1, type: 1, createdAt: -1 }`
     - projections: `{ groupCode: 1, participantId: 1 }` unique, `{ userId: 1 }`, `{ groupCode: 1, balanceValue: 1 }`
   - Search should use indexed filters first (`groupCode`, optional `involvedParticipantIds`, category/type) before note text matching. If note search becomes large, add a text/search index rather than loading all group records.
   - Rationale: the native client needs home totals, group lists, balance lists, member detail records, and search without relying on partial local state.
   - Alternative considered: keep record counts in the client. That is the bug we are removing.

6. **Apply record mutations through reversible ledger effects.**
   - Decision: add, update, and hard delete use a transaction:
     - add: validate payload, create record, apply its projection deltas.
     - update: load old record, reverse old deltas, replace record with new payload, apply new deltas.
     - delete: load old record, reverse old deltas, delete the record.
   - Each record type has a pure effect builder that returns per-participant deltas for balance, expense share, paid total, settlement in/out, and record count.
   - Rationale: update remains simple for users, while the backend avoids fragile delta guessing and keeps projections consistent.
   - Alternative considered: physical delete and recreate with a new record id on update. That is equivalent for balances, but preserving the record id is easier for list/detail UI.

7. **Define two first-class record types.**
   - Decision: `expense` records require `amount > 0`, `payerId`, and non-empty `participantIds`. They affect balance, expense share, paid total, and record count. `settlement` records require `amount > 0`, `fromId`, and `toId`. They affect balance, settlement in/out, and record count, but not expense share.
   - Rationale: settlement is also a money event and must appear in counts and participant detail records, but it is not consumed travel cost.
   - Alternative considered: keep `isDebtResolve` on a generic record. That obscures record meaning and makes DTO validation weaker.

8. **Move settlement suggestions and resolve execution to the backend.**
   - Decision: `GET /walkcalc/groups/:code/settlement-suggestion` calculates from current projections. `POST /walkcalc/groups/:code/settlements/resolve` re-reads current projections in a transaction, recomputes or validates the selected plan, creates settlement records, and updates projections.
   - Rationale: the client must not submit stale or malicious settlement transfers as final truth.
   - Algorithm: use an exact minimum-transfer algorithm for groups up to a configured non-zero participant limit. For larger groups, either reject with a clear error or return a deterministic fallback marked by strategy, depending on the final product decision.
   - Alternative considered: keep greedy settlement in the client. It is not authoritative and can produce stale or non-minimal plans.

9. **Make archive eligibility a backend invariant.**
   - Decision: archive requests fail unless every participant projection in the group has `balanceValue == 0`.
   - Rationale: archive represents a fully settled group and cannot be enforced safely by a client button state.
   - Alternative considered: only require the current user's balance to be zero. That leaves unresolved group debt hidden by archive state.

10. **Design APIs around client view models.**
    - Decision: provide endpoints for the actual native consumption surfaces:
      - home summary with all-group total balance.
      - paginated group list and group detail.
      - group records with search/pagination.
      - balances list with participant projections and record counts.
      - participant balance detail records with total.
      - settlement suggestion and resolve.
    - Rationale: API boundaries should return authoritative facts instead of forcing the native app to infer them from partial collections.
    - Alternative considered: expose only low-level records/groups and let clients compose. That recreates the current correctness bug.

11. **Make tests a hard acceptance gate for the ledger rewrite.**
    - Decision: implementation is not complete until tests cover the main ledger flows and edge cases at the money helper, effect builder, service, controller, and projection-rebuild levels.
    - Required test classes include: decimal parsing and formatting, deterministic split remainder allocation, expense and settlement add/update/delete, temporary users, payer-in-participants, participant record counts, home totals across archived and unpaged groups, backend search totals, archive rejection, exact settlement suggestions, failed mutation atomicity, and rejection of old `Minor` API fields.
    - Rationale: ledger bugs are expensive because a small arithmetic drift propagates into every balance view. The projection rebuild oracle provides an independent check that materialized state matches the record ledger.
    - Alternative considered: rely on UI tests and a few service happy paths. That would miss backend invariants, failure rollback behavior, and edge-case rounding.

## Risks / Trade-offs

- Transaction support depends on Mongo deployment mode -> keep mutation code centralized and fail safely if transactions are unavailable in environments that need consistency.
- Exact minimum settlement can be expensive for many non-zero participants -> set and test a supported exact threshold, then decide whether to reject or return a marked fallback above it.
- Materialized projections can drift if any write path bypasses the ledger service -> make all WalkCalc writes go through one service and add rebuild-oracle tests that compare projections against records.
- Decimal string APIs require strict validation and formatting -> add DTO validators and Money helper tests for parsing, splitting, rounding, positive-only amounts, and zero comparison.
- Incomplete tests can let projection drift or API contract regressions ship -> keep implementation tasks blocked until the strict WalkCalc test suite passes locally.
- More collections mean more joins at response time -> batch-load participants, projections, and user profiles, and keep indexes aligned with the listed client views.
- Breaking API changes require native coordination -> publish the new DTO contract in specs and avoid old/new compatibility unless explicitly requested later.

## Migration Plan

1. Add new schemas, DTOs, money helper, and repository/service layers behind the WalkCalc module.
2. Replace WalkCalc controllers with the new route contract and remove old embedded-record DTO mapping.
3. Add projection rebuild helpers for tests and operational repair, but do not backfill abandoned legacy data.
4. Update tests to seed only the new collections.
5. Deploy backend and migrate native client callers together.
6. Rollback by reverting the WalkCalc module change; no old production WalkCalc data migration is required.

## Open Questions

- What exact threshold should settlement suggestion use for the exact minimum-transfer algorithm before rejecting or falling back?
- Should note search use Mongo text indexes immediately, or is indexed group/category filtering plus bounded note matching acceptable for the first backend rewrite?
