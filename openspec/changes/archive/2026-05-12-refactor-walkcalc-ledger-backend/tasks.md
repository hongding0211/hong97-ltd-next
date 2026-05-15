## 1. Data Model And Money Foundation

- [x] 1.1 Replace embedded WalkCalc group schema usage with normalized schemas for groups, participants, records, and participant projections.
- [x] 1.2 Add required Mongo indexes for group lookup, participant membership, record pagination, participant record filtering, and projection lookup.
- [x] 1.3 Implement a WalkCalc money helper that parses decimal strings, stores exact integer-cent values, formats canonical decimal strings, validates positive amounts, compares zero, and splits cents deterministically.
- [x] 1.4 Remove legacy money compatibility from WalkCalc DTO mapping, including `paid`, `paidMinor`, `debtMinor`, and `costMinor` response/input paths.
- [x] 1.5 Add unit tests for money parsing, formatting, positive validation, exact splitting, invalid input rejection, and zero comparison.

## 2. Ledger Effect And Projection Engine

- [x] 2.1 Implement pure ledger effect builders for expense records that produce balance, expense share, paid total, and record count deltas.
- [x] 2.2 Implement pure ledger effect builders for settlement records that produce balance, settlement in/out, and record count deltas without expense share changes.
- [x] 2.3 Implement projection apply and reverse operations using transactional writes and bulk updates.
- [x] 2.4 Add a projection rebuild oracle for tests and operational repair that recomputes projections from records.
- [x] 2.5 Add invariant checks that group participant balances sum to zero after mutation test fixtures.

## 3. Group And Participant APIs

- [x] 3.1 Update create, join, invite, and temporary-user flows to create participant and projection documents with zero values.
- [x] 3.2 Update group list and group detail response DTOs to include semantic projection fields and formal user profile data resolved from `UserService`.
- [x] 3.3 Add a home summary endpoint that returns total balance across all groups for the current user, including archived and unpaged groups.
- [x] 3.4 Update archive flow to reject unsettled groups where any participant balance is non-zero.
- [x] 3.5 Preserve authorization checks for owner/member access across normalized participant storage.

## 4. Record APIs

- [x] 4.1 Replace generic record DTOs with explicit expense and settlement request/response shapes using `amount`, `payerId`, `participantIds`, `fromId`, and `toId`.
- [x] 4.2 Implement add expense record with positive amount validation, participant validation, record creation, projection updates, and group modified time update.
- [x] 4.3 Implement add settlement record for backend-created or allowed settlement mutations with positive amount validation and projection updates.
- [x] 4.4 Implement update record by reversing the old record effects, replacing the record, applying new effects, and preserving the record id.
- [x] 4.5 Implement hard delete record by reversing effects and deleting the record document.
- [x] 4.6 Implement group record list/search with backend filtering, pagination, accurate total, and newest-first sorting.
- [x] 4.7 Implement participant record list with `involvedParticipantIds` filtering, pagination, accurate total, and newest-first sorting.

## 5. Balances And Settlement APIs

- [x] 5.1 Add a balances endpoint that returns every formal and temporary participant with balance, expense share, paid total, record count, settlement in, and settlement out.
- [x] 5.2 Add a participant balance detail endpoint that returns the selected participant projection plus backend-filtered records and accurate total.
- [x] 5.3 Implement backend settlement suggestion from participant projections, including exact minimum-transfer behavior within the configured non-zero participant limit.
- [x] 5.4 Implement resolve settlement by re-reading current projections, creating settlement records, updating projections, and returning updated balance data.
- [x] 5.5 Add validation/error behavior for exact settlement limit overflow according to the final design decision.

## 6. Tests And Verification

- [x] 6.1 Add money helper unit tests for valid decimal strings, canonical formatting, invalid precision, invalid signs, zero rejection, max/min boundaries, exact comparison, and deterministic remainder splits.
- [x] 6.2 Add pure effect-builder unit tests for expense main cases, payer included in participants, payer excluded from participants, formal users, temporary users, uneven splits, duplicate participant rejection, and large valid amounts.
- [x] 6.3 Add pure effect-builder unit tests for settlement main cases, settlement in/out totals, record count deltas, expense share exclusion, same-participant rejection, and non-positive amount rejection.
- [x] 6.4 Add service mutation tests for expense add/update/delete that assert records, projections, group modified time, exact balances, expense share, paid total, record counts, and projection rebuild equality.
- [x] 6.5 Add service mutation tests for settlement add/update/delete and resolve-all that assert records, projections, settlement totals, record counts, expense share stability, and all balances resolving to zero.
- [x] 6.6 Add failed-mutation atomicity tests for invalid participant, missing record, invalid amount, unauthorized user, duplicate temp user, transaction error, and exact-settlement limit overflow.
- [x] 6.7 Add API/controller contract tests for semantic money field names, rejected legacy `Minor` fields, positive-only amounts, response profile resolution, authorization, and non-member access.
- [x] 6.8 Add API/controller tests for home total balance including archived groups and groups outside the current pagination page.
- [x] 6.9 Add API/controller tests for balances list, participant detail records, accurate totals, settlement records in counts, search, pagination, and temporary-user detail views.
- [x] 6.10 Add archive tests for settled and unsettled groups, including groups where only the current user's balance is zero but another participant remains unsettled.
- [x] 6.11 Run backend WalkCalc unit and controller tests and treat any skipped ledger test as a blocker unless explicitly justified in the task notes.

## 7. Cleanup And Coordination

- [x] 7.1 Remove obsolete embedded-record helper code, legacy response mapping, and unused i18n keys after the new contract is covered by tests.
- [x] 7.2 Document the new WalkCalc backend API shapes for native client migration.
- [x] 7.3 Confirm no old WalkCalc data migration or compatibility path remains in the implementation.
