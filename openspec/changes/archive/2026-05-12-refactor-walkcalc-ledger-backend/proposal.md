## Why

WalkCalc's current backend stores records, participants, and balance totals inside one group document, which makes record queries, participant statistics, home totals, and settlement suggestions depend on inefficient aggregate reads or incomplete client-side data. The product now needs the backend to be the authoritative ledger for all money, statistics, settlement, and archive decisions without preserving legacy data compatibility.

## What Changes

- **BREAKING** Replace the current embedded-record WalkCalc group aggregate with a backend-ledger model that separates group metadata, participants, records, and participant projections.
- **BREAKING** Rename money-facing API fields away from implementation-specific `Minor` terminology and expose decimal money strings such as `amount`, `balance`, `expenseShare`, and `paidTotal`.
- **BREAKING** Redesign record APIs around explicit `expense` and `settlement` record types with positive amounts only.
- Allow record add, update, and hard delete while keeping all balance and statistic projections consistent inside backend transactions.
- Move home total balance, balances list, member record totals, settlement suggestions, and archive eligibility to backend-owned APIs.
- Make archive fail unless every participant in the group has a zero balance.
- Resolve formal user display data through the existing user service instead of copying names or avatars into WalkCalc participant storage.
- Keep temporary users as group-local participants that participate in records, balances, statistics, and settlement exactly like formal users.
- Treat settlement records as first-class money records that count toward record totals but do not increase expense share.
- Add strict backend unit and controller coverage for main ledger flows, edge cases, failure atomicity, projection invariants, and API contract changes.

## Capabilities

### New Capabilities
- `walkcalc-ledger-backend`: Defines the normalized WalkCalc ledger storage, money field semantics, record mutations, participant projections, settlement suggestions, and archive constraints.

### Modified Capabilities
- `walkcalc-server`: Replaces the migrated embedded WalkCalc record and balance contract with the new backend-authoritative ledger API contract.

## Impact

- Affects `packages/server/src/modules/walkcalc` controllers, services, DTOs, schemas, tests, and module wiring.
- Adds or replaces Mongo collections for WalkCalc groups, participants, records, and participant projections.
- Changes client-facing WalkCalc API response and request shapes; native callers must migrate to the new field names and endpoints.
- Requires query indexes for group lists, participant membership, record pagination/search, participant record views, and projection lookups.
- Requires a comprehensive WalkCalc test suite before implementation is accepted, including exact money math and projection rebuild comparisons.
- Removes legacy compatibility requirements for existing WalkCalc group documents and old money field names.
